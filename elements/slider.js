/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 *
 */
// #ifdef __JSLIDER || __JRANGE || __INC_ALL

/**
 * Element allowing the user to select a value from a range of
 * values between a minimum and a maximum value.
 * Example:
 * This example shows a slider that influences the position of a video. The
 * value attribute of the slider is set using property binding. The square
 * brackets imply a {@link term.propertybinding bidirectional binding}.
 * <code>
 *  <j:video id="player1"
 *    src      = "elements/video/demo_video.flv"
 *    autoplay = "true">
 *      Unsupported video codec.
 *  </j:video>
 *
 *  <j:button onclick="player1.play()">play</j:button>
 *  <j:button onclick="player1.pause()">pause</j:button>
 *
 *  <j:slider value="[player1.position]" />
 * </code>
 * Example:
 * This example shows two slider which lets the user indicate a value in a form.
 * <code>
 *  <j:label>How would you grade the opening hours of the helpdesk</j:label>
 *  <j:slider ref="hours_hd"
 *    mask  = "no opinion|bad|below average|average|above average|good"
 *    min   = "0"
 *    max   = "5"
 *    step  = "1"
 *    slide = "snap" />
 *
 *  <j:label>How soon will you make your buying decision</j:label>
 *  <j:slider ref="decide_buy"
 *    mask  = "undecided|1 week|1 month|6 months|1 year|never"
 *    min   = "0"
 *    max   = "5"
 *    step  = "1"
 *    slide = "snap" />
 * </code>
 *
 * @constructor
 * @define slider, range
 * @allowchild {smartbinding}
 * @addnode elements
 *
 * @author      Ruben Daniels
 * @version     %I%, %G%
 * @since       0.9
 *
 * @inherits jpf.Presentation
 * @inherits jpf.DataBinding
 * @inherits jpf.Validation
 * @inherits jpf.XForms
 *
 * @binding value  Determines the way the value for the element is retrieved 
 * from the bound data.
 * Example:
 * Sets the slider position based on data loaded into this component.
 * <code>
 *  <j:slider>
 *      <j:bindings>
 *          <j:value select="@value" />
 *      </j:bindings>
 *  </j:slider>
 * </code>
 * Example:
 * A shorter way to write this is:
 * <code>
 *  <j:slider ref="@value" />
 * </code>
 */
jpf.range  =
jpf.slider = jpf.component(jpf.NODE_VISIBLE, function(){
    this.$focussable = true; // This object can get the focus

    var _self    = this;
    var dragging = false;

    /**** Properties and Attributes ****/
    this.disabled = false; // Object is enabled
    this.realtime = true;
    this.balloon  = true;
    this.value    = 0;
    this.mask     = "%";
    this.min      = 0;
    this.max      = 1;

    this.$supportedProperties.push("step", "mask", "min",
        "max", "slide", "value", "markers");

    this.$booleanProperties["realtime"] = true;
    this.$booleanProperties["markers"]  = true;
    this.$booleanProperties["balloon"]  = true;

    /**
     * @attribute {Boolean} realtime whether the slider updates it's value realtime, or just when the user stops dragging.
     * @attribute {Boolean} balloon  whether to show the balloon with extra information on the position of the slider. Default is true when the skin supports it.
     * @attribute {Number}  step     specifying the step size of a discreet slider.
     * Example:
     * <code>
     *  <j:label>How much money do you make annualy.</j:label>
     *  <j:range ref="salary"
     *    min   = "0"
     *    max   = "50000"
     *    step  = "1000"
     *    slide = "snap" />
     * </code>
     */
    this.$propHandlers["step"] = function(value){
        this.step = parseInt(value) || 0;

        if (!this.$hasLayoutNode("marker"))
            return;

        if (!this.slider)
            this.slideDiscreet = true;
    }

    /**
     * @attribute {Boolean} markers whether to display a marker at each discrete step.
     */
    this.$propHandlers["markers"] = function(value){
        //Remove Markers
        var markers = this.oMarkers.childNodes;
        for (var i = markers.length - 1; i >= 0; i--) {
            if (markers[i].tagName == "u" && markers[i].nodeType == 1) //small hack
                jpf.removeNode(markers[i]);
        }

        if (!this.step && this.$jml)
            this.step = parseInt(this.$jml.getAttribute("step")) || 0;

        //Add markers
        if (value && this.step) {
            var pos, count = (this.max - this.min) / this.step;
            var prop = this.$dir == "horizontal" ? "left" : "top";
            var size = this.$dir == "horizontal"
                ? this.oExt.offsetWidth - this.oKnob.offsetWidth
                : this.oExt.offsetHeight - this.oKnob.offsetHeight;
            
            for (var o, nodes = [], i = 1; i < count; i++) {
                this.$getNewContext("marker");
                o = this.$getLayoutNode("marker");
                pos = Math.max(0, ((i+1) * (1 / (count + 1))));
                o.setAttribute("style", prop + ":" + (pos * size) + "px");
                nodes.push(o);
            }

            jpf.xmldb.htmlImport(nodes, this.oMarkers);
        }
    }
    
    this.$resize = function(){
        this.$propHandlers.value.call(this, this.value);
        var pos, count = (this.max - this.min) / this.step;
        var prop = this.$dir == "horizontal" ? "left" : "top";
        var size = this.$dir == "horizontal"
            ? this.oExt.offsetWidth - this.oKnob.offsetWidth
            : this.oExt.offsetHeight - this.oKnob.offsetHeight;
        
        var nodes = this.oMarkers.getElementsByTagName("u");//small hack
        for (var i = nodes.length - 1; i >= 0; i--) {
            pos = Math.max(0, (i+1) * (1 / count));
            nodes[i].style[prop] = Math.round(pos * size) + "px";
        }
    }

    /**
     * @attribute {String} mask a pipe '|' seperated list of strings that are
     * used as the caption of the slider when their connected value is picked.
     * Example:
     * <code>
     *  <j:label>How big is your cat?</j:label>
     *  <j:slider ref="decide_buy"
     *    mask  = "don't know|20cm|25cm|30cm|35cm|&gt; 35cm"
     *    min   = "0"
     *    max   = "5"
     *    step  = "1"
     *    slide = "snap" />
     * </code>
     */
    this.$propHandlers["mask"] = function(value){
        if (!value)
            this.mask = "%";

        if (!this.mask.match(/^(%|#)$/))
            this.mask = value.split(/\||;/);
    }

    /**
     * @attribute {String} progress a value between 0 and 1 which is visualized
     * inside the slider. This can be used to show a progress indicator for
     * the download of movies or other media.
     * Example:
     * <code>
     *  <j:video id="player1"
     *    src      = "elements/video/demo_video.flv"
     *    autoplay = "true">
     *      Unsupported video codec.
     *  </j:video>
     *
     *  <j:slider value="[player1.position]" progress="{player1.progress}" />
     * </code>
     */
    this.$propHandlers["progress"] = function(value){
        if (!this.oProgress) {
            this.oProgress =
              jpf.xmldb.htmlImport(this.$getLayoutNode("progress"),
                this.$getLayoutNode("main", "progress", this.oExt));
        }

        this.oProgress.style.width = ((value || 0) * 100) + "%";
    }

    /**
     * @attribute {Number} min the minimal value the slider can have. This is
     * the value that the slider has when the grabber is at it's begin position.
     */
    this.$propHandlers["min"] = function(value){
        this.min = parseInt(value) || 0;
    }

    /**
     * @attribute {Number} max the maximal value the slider can have. This is
     * the value that the slider has when the grabber is at it's end position.
     */
    this.$propHandlers["max"] = function(value){
        this.max = parseInt(value) || 1;
    }

    /**
     * @attribute {String} slide the way the grabber can be handled
     *   Possible values:
     *   normal     the slider moves over a continuous space.
     *   discrete   the slider's value is discrete but the grabber moves over a continuous space and only snaps when the user lets go of the grabber.
     *   snap       the slider snaps to the discrete values it can have while dragging.
     * Remarks:
     * Discrete space is set by the step attribute.
     */
    this.$propHandlers["slide"] = function(value){
        this.slideDiscreet = value == "discrete";
        this.slideSnap     = value == "snap";
    }

    /**
     * @attribute {String} value the value of slider which is represented in
     * the position of the grabber using the following
     * formula: (value - min) / (max - min)
     */
    this.$propHandlers["value"] = function(value, force, prop, animate){
        if (!this.$dir)
            return; //@todo fix this

        if (dragging && !force && !_self.realtime)
            return;

        this.value = Math.max(this.min, Math.min(this.max, value)) || 0;
        var max, min, offset,
            multiplier = (this.value - this.min) / (this.max - this.min);

        if (this.$dir == "horizontal") {
            max = (this.oContainer.offsetWidth
                - jpf.getWidthDiff(this.oContainer))
                - this.oKnob.offsetWidth;
            min = parseInt(jpf.getBox(
                jpf.getStyle(this.oContainer, "padding"))[3]);

            offset = (((max - min) * multiplier) + min);
            if (animate) {
                jpf.tween.single(this.oKnob, {
                    type    : 'left',
                    steps   : 5,
                    interval: 10,
                    from    : this.oKnob.offsetLeft,
                    to      : offset,
                    anim    : jpf.tween.NORMAL,
                    oneach  : function(oNode) {
                        if (_self.oFill)
                            _self.oFill.style.width = (oNode.offsetLeft + 3) + "px";
                    }
                });
            }
            else {
                this.oKnob.style.left = offset + "px";
                if (this.oFill)
                    this.oFill.style.width = (offset + 3) + "px";
            }
        }
        else {
            max = (this.oContainer.offsetHeight
                - jpf.getHeightDiff(this.oContainer))
                - this.oKnob.offsetHeight;
            min = parseInt(jpf.getBox(
                jpf.getStyle(this.oContainer, "padding"))[0]);

            offset = (((max - min) * (1 - multiplier)) + min);

            if (animate) {
                jpf.tween.single(this.oKnob, {
                    type    : 'top',
                    steps   : 5,
                    interval: 10,
                    from    : this.oKnob.offsetTop,
                    to      : offset,
                    anim    : jpf.tween.NORMAL,
                    oneach  : function(oNode) {
                        if (_self.oFill)
                            _self.oFill.style.height = (oNode.offsetTop + 3) + "px";
                    }
                });
            }
            else {
                this.oKnob.style.top = offset + "px";
                if (this.oFill)
                    this.oFill.style.height = (offset + 3) + "px";
            }
        }

        if (this.oLabel) {
            //Percentage
            if (this.mask == "%") {
                this.oLabel.nodeValue = Math.round(multiplier * 100) + "%";
            }
            //Number
            else if (this.mask == "#") {
                //status = this.value;
                this.oLabel.nodeValue = this.step
                    ? (Math.round(this.value / this.step) * this.step)
                    : this.value;
            }
            //Lookup
            else {
                this.oLabel.nodeValue = this.mask[Math.round(this.value - this.min)
                    / (this.step || 1)]; //optional floor ??
            }
        }
    };

    /**** Public methods ****/

    /**
     * Sets the value of this element. This should be one of the values
     * specified in the values attribute.
     * @param {String} value the new value of this element
     */
    this.setValue = function(value, onlySetXml){
        this.$onlySetXml = onlySetXml;//blrgh..
        this.setProperty("value", value);
        this.$onlySetXml = false;
    };

    /**
     * Returns the current value of this element.
     * @return {String}
     */
    this.getValue = function(){
        return this.step
            ? Math.round(parseInt(this.value) / this.step) * this.step
            : this.value;
    };

    /**** Keyboard support ****/

    // #ifdef __WITH_KEYBOARD
    this.addEventListener("keydown", function(e){
        var key      = e.keyCode;
        var ctrlKey  = e.ctrlKey;
        var shiftKey = e.shiftKey;

        switch (key) {
            case 37:
                //LEFT
                if (this.$dir != "horizontal")
                    return;
                this.setValue(this.value - (ctrlKey ? 0.01 : 0.1));
                break;
            case 38:
                //UP
                if (this.$dir != "vertical")
                    return;
                this.setValue(this.value + (ctrlKey ? 0.01 : 0.1));
                break;
            case 39:
                //RIGHT
                if (this.$dir != "horizontal")
                    return;
                this.setValue(this.value + (ctrlKey ? 0.01 : 0.1));
                break;
            case 40:
                //DOWN
                if (this.$dir != "vertical")
                    return;
                this.setValue(this.value - (ctrlKey ? 0.01 : 0.1));
                break;
            default:
                return;
        }

        return false;
    }, true);
    // #endif

    /**** Init ****/

    this.$draw = function(){
        //Build Main Skin
        this.oExt         = this.$getExternal();
        this.oLabel       = this.$getLayoutNode("main", "status", this.oExt);
        this.oMarkers     = this.$getLayoutNode("main", "markers", this.oExt);
        this.oKnob        = this.$getLayoutNode("main", "slider", this.oExt);
        this.oFill        = this.$getLayoutNode("main", "fill", this.oExt);
        this.oBalloon     = this.$getLayoutNode("main", "balloon", this.oExt);
        this.oInt         = this.oContainer = this.$getLayoutNode("main",
            "container", this.oExt);

        this.$dir         = this.$getOption("main", "direction") || "horizontal";

        this.oKnob.style.left = (parseInt(jpf.getBox(
            jpf.getStyle(this.oExt, "padding"))[3])) + "px";

        function prepareKnob(e) {
            this.x   = (e.clientX || e.x);
            this.y   = (e.clientY || e.y);
            this.stX = this.offsetLeft;
            this.siX = this.offsetWidth
            this.stY = this.offsetTop;
            this.siY = this.offsetheight
            this.startValue = _self.value;

            if (_self.$dir == "horizontal") {
                this.max = parseInt(jpf.getStyle(_self.oContainer, "width"))
                    - this.offsetWidth;
                this.min = parseInt(jpf.getBox(
                    jpf.getStyle(_self.oContainer, "padding"))[3]);
            }
            else {
                this.max = parseInt(jpf.getStyle(_self.oContainer, "height"))
                    - this.offsetHeight;
                this.min = parseInt(jpf.getBox(
                    jpf.getStyle(_self.oContainer, "padding"))[0]);
            }
        }

        function getKnobValue(o, e, slideDiscreet){
            var to = (_self.$dir == "horizontal")
                ? (e.clientX || e.x) - o.x + o.stX
                : (e.clientY || e.y) - o.y + o.stY;
            to = (to > o.max ? o.max : (to < o.min ? o.min : to));
            var value = (((to - o.min) * 100 / (o.max - o.min) / 100)
                * (_self.max - _self.min)) + _self.min;

            value = slideDiscreet
                ? (Math.round(value / _self.step) * _self.step)
                : value;
            value = (_self.$dir == "horizontal") ? value : 1 - value;

            return value;
        }

        this.oKnob.onmousedown = function(e){
            if (_self.disabled)
                return false;

            //@todo use start action here

            e = e || window.event;
            document.dragNode = this;

            prepareKnob.call(this, e);

            _self.$setStyleClass(this, "btndown", ["btnover"]);

            jpf.dragmode.mode = true;

            dragging = true;
            
            if (_self.balloon && _self.oBalloon) {
                _self.oBalloon.style.display = "block";
                _self.oBalloon.style.left = (_self.oKnob.offsetLeft 
                    - (_self.oBalloon.offsetWidth 
                    - _self.oKnob.offsetWidth)/2) + "px";
            }
            
            var timer, lastTime;
            document.onmousemove = function(e){
                e = e || window.event;
                var o = this.dragNode;
                if (!o) {
                    jpf.dragmode.mode = document.onmousemove
                        = document.onmouseup = null;

                    return; //?
                }

                var knobValue = getKnobValue(o, e, _self.slideSnap);
                if (_self.realtime) {
                    _self.value = -1; //reset value
                    if (_self.slideDiscreet) {
                        this.$onlySetXml = true;//blrgh..
                        _self.change(Math.round(knobValue / _self.step) * _self.step);
                        this.$onlySetXml = false;
                        _self.$propHandlers["value"].call(_self, knobValue, true);
                    }
                    else
                        _self.change(knobValue);
                }
                else {
                    _self.$propHandlers["value"].call(_self, knobValue, true);
                }
                
                if (_self.balloon && _self.oBalloon)
                    _self.oBalloon.style.left = (_self.oKnob.offsetLeft 
                        - (_self.oBalloon.offsetWidth 
                        - _self.oKnob.offsetWidth)/2) + "px";
                
                /*clearTimeout(timer);
                if (new Date().getTime() - lastTime > 20) {
                    _self.$propHandlers["value"].call(_self, knobValue, true);
                    lastTime = new Date().getTime();
                }
                else {
                    timer = setTimeout(function(){
                        _self.$propHandlers["value"].call(_self, knobValue, true);
                        lastTime = new Date().getTime();
                    }, 20);
                }*/
            }

            document.onmouseup = function(e){
                var o = this.dragNode;
                this.dragNode = null;

                o.onmouseout();

                dragging = false;

                var knobValue = getKnobValue(o, e || window.event,
                    _self.slideDiscreet || _self.slideSnap);

                _self.value = -1;
                //_self.$ignoreSignals = _self.realtime;
                _self.change(knobValue);
                //_self.$ignoreSignals = false;
                
                if (_self.slideDiscreet)
                    _self.$propHandlers["value"].call(_self, knobValue, true);

                jpf.dragmode.mode    = 
                document.onmousemove = 
                document.onmouseup   = null;

                if (_self.balloon && _self.oBalloon) {
                    _self.oBalloon.style.left = (_self.oKnob.offsetLeft 
                        - (_self.oBalloon.offsetWidth 
                        - _self.oKnob.offsetWidth)/2) + "px";
                    
                    setTimeout(function(){
                        jpf.tween.single(_self.oBalloon, {
                            type : "fade",
                            from : 1,
                            to   : 0,
                            steps : 5,
                            onfinish : function(){
                                _self.oBalloon.style.display = "none";
                                if (jpf.isIE)
                                    _self.oBalloon.style.filter = "";
                            }
                        })
                    }, _self.slideDiscreet ? 200 : 0);
                }
            };
            //event.cancelBubble = true;
            return false;
        };

        this.oKnob.onmouseup = this.oKnob.onmouseover = function(){
            if (document.dragNode != this)
                _self.$setStyleClass(this, "btnover", ["btndown"]);
        };

        this.oKnob.onmouseout = function(){
            if (document.dragNode != this)
                _self.$setStyleClass(this, "", ["btndown", "btnover"]);
        };

        this.oExt.onmousedown = function(e) {
            if (_self.disabled) return false;
            e = e || window.event;

            var o = _self.oKnob;
            if ((e.srcElement || e.target) != o) {
                var p = jpf.getAbsolutePosition(o);
                prepareKnob.call(o, {
                    x : p[0] + o.offsetWidth / 2,
                    y : p[1] + o.offsetHeight / 2
                });
                var value = getKnobValue(o, e, _self.slideDiscreet || _self.slideSnap);
                _self.$propHandlers["value"].call(_self, getKnobValue(o, e, _self.slideDiscreet), true, null, true);
                _self.setValue(value);
            }
        };

        // #ifdef __SUPPORT_IPHONE
        if (jpf.isIphone)
            jpf.iphone.linkEvents(this.oKnob);
        // #endif

        //#ifdef __WITH_LAYOUT
        jpf.layout.setRules(this.oExt, "knob", 
            "jpf.all[" + this.uniqueId + "].$resize()", true);
        //#endif
    };

    this.$loadJml = function(x){
        this.$propHandlers["value"].call(this, this.value);

        //@todo this goes wrong with skin switching. smartbindings is called again.
        jpf.JmlParser.parseChildren(this.$jml, null, this);
    };

    this.$destroy = function(){
        this.oKnob.onmousedown =
        this.oKnob.onmouseup   =
        this.oKnob.onmouseover =
        this.oKnob.onmouseout  = null;
        
        //#ifdef __WITH_LAYOUT
        jpf.layout.removeRule(this.oExt, "knob");
        //#endif
    };
}).implement(
    // #ifdef __WITH_DATABINDING
    jpf.DataBinding,
    // #endif
    //#ifdef __WITH_VALIDATION || __WITH_XFORMS
    jpf.Validation,
    //#endif
    //#ifdef __WITH_XFORMS
    jpf.XForms,
    //#endif
    jpf.Presentation
);

// #endif
