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
//#ifdef __WITH_STATE || __JSTATE || __INC_ALL

/**
 * @private
 */
apf.StateServer = {
    states: {},
    groups: {},
    locs  : {},

    removeGroup: function(name, elState){
        this.groups[name].remove(elState);
        if (!this.groups[name].length) {
            if (self[name]) {
                self[name].destroy();
                self[name] = null;
            }

            delete this.groups[name];
        }
    },

    addGroup: function(name, elState, pNode){
        if (!this.groups[name]) {
            this.groups[name] = [];

            var pState = new apf.state(null, "state");
            pState.parentNode = pNode;
            pState.implement(apf.AmlDom);
            pState.name   = name;
            pState.toggle = function(){
                for (var next = 0, i = 0; i < apf.StateServer.groups[name].length; i++) {
                    if (apf.StateServer.groups[name][i].active) {
                        next = i + 1;
                        break;
                    }
                }

                apf.StateServer.groups[name][
                    (next == apf.StateServer.groups[name].length) ? 0 : next
                  ].activate();
            }

            this.groups[name].pState = self[name] = pState;
        }

        if (elState)
            this.groups[name].push(elState);

        return this.groups[name].pState;
    },

    removeState: function(elState){
        delete this.states[elState.name];
    },

    addState: function(elState){
        this.states[elState.name] = elState;
    }
}

/**
 * Element that specifies a certain state of (a part of) the application. With
 * state we mean a collection of properties on objects that have a certain
 * value at one time. This element allows you to specify which properties on
 * which elements should be set when a state is activated. This element can
 * belong to a state-group containing multiple elements with a default state.
 * Example:
 * This example shows a log in window and four state elements in a state-group.
 * <code>
 *  <a:window id="winLogin" title="Log in">
 *      ...
 *
 *      <a:text id="loginMsg" height="20" left="10" bottom="10" />
 *      <a:button>Log in</a:button>
 *  </a:window>
 *
 *  <a:state-group
 *    loginMsg.visible  = "false"
 *    winLogin.disabled = "false">
 *      <a:state id="stFail"
 *          loginMsg.value   = "Username or password incorrect"
 *          loginMsg.visible = "true" />
 *      <a:state id="stError"
 *          loginMsg.value   = "An error has occurred. Please check your network."
 *          loginMsg.visible = "true" />
 *      <a:state id="stLoggingIn"
 *          loginMsg.value    = "Please wait while logging in..."
 *          loginMsg.visible  = "true"
 *          winLogin.disabled = "true" />
 *      <a:state id="stIdle" />
 *  </a:state-group>
 * </code>
 * Example:
 * This example shows a label using property binding to get it's caption
 * based on the current state.
 * <code>
 *  <a:state group="stRole" id="stUser" caption="You are a user" active="true" />
 *  <a:state group="stRole" id="stAdmin" caption="You have super powers" />
 *
 *  <a:label value="{stRole.caption}" />
 *  <a:button onclick="stAdmin.activate()">Become admin</a:button>
 * </code>
 *
 * @event change Fires when the active property of this element changes.
 *
 * @constructor
 * @define state
 * @addnode global
 *
 * @author      Ruben Daniels (ruben AT javeline DOT com)
 * @version     %I%, %G%
 * @since       0.9
 */
apf.state = apf.component(apf.NODE_HIDDEN, function(){

    /**** Properties and Attributes ****/

    this.$supportedProperties.push("active");

    /**
     * @attribute {Boolean} active whether this state is the active state
     */
    this.$propHandlers["active"] = function(value){
        //Activate State
        if (apf.isTrue(value)) {
            if (this.group) {
                var nodes = apf.StateServer.groups[this.group];
                if (!nodes) {
                    apf.StateServer.addGroup(this.group, this);
                    nodes = apf.StateServer.groups[this.group];
                }
                
                for (var i = 0; i < nodes.length; i++) {
                    if (nodes[i] != this && nodes[i].active !== false)
                        nodes[i].deactivate();
                }
            }

            var q = this.$signalElements;
            for (var i = 0; i < q.length; i++) {
                if (!self[q[i][0]] || !self[q[i][0]].setProperty) {
                    //#ifdef __DEBUG
                    throw new Error(apf.formatErrorString(1013, this,
                        "Setting State",
                        "Could not find object to give state: '"
                        + q[i][0] + "' on property '" + q[i][1] + "'"));
                    //#endif
                    
                    continue;
                }

                self[q[i][0]].setProperty(q[i][1], this[q[i].join(".")]);
            }

            if (this.group) {
                var attr = this.$aml.attributes;
                for (var i = 0; i < attr.length; i++) {
                    if (attr[i].nodeName.match(/^on|^(?:group|id)$|^.*\..*$/))
                        continue;
                    self[this.group].setProperty(attr[i].nodeName,
                        attr[i].nodeValue);
                }
            }

            this.dispatchEvent("change");

            //#ifdef __DEBUG
            apf.console.info("Setting state '" + this.name + "' to ACTIVE");
            //#endif
        }

        //Deactivate State
        else {
            this.setProperty("active", false);
            this.dispatchEvent("change");

            //#ifdef __DEBUG
            apf.console.info("Setting state '" + this.name + "' to INACTIVE");
            //#endif
        }
    };


    /**** Public methods ****/

    /**
     * Sets the value of this element. This should be one of the values
     * specified in the values attribute.
     * @param {String} value the new value of this element
     */
    this.setValue = function(value){
        this.active = 9999;
        this.setProperty("active", value);
    };

    /**
     * Actives this state, setting all the properties on the elements that
     * were specified.
     */
    this.activate = function(){
        this.active = 9999;
        this.setProperty("active", true);
    };

    /**
     * Deactivates the state of this element. This is mostly a way to let all
     * elements that have property bound to this state know it is no longer
     * active.
     */
    this.deactivate = function(){
        this.setProperty("active", false);
    };

    /**** Init ****/

    this.$signalElements = [];

    this.$loadAml = function(x){
        apf.StateServer.addState(this);

        this.group = x.getAttribute("group");
        if (this.group)
            apf.StateServer.addGroup(this.group, this);

        if (x.getAttribute("location"))
            apf.StateServer.locs[x.getAttribute("location")] = this;

        //Properties initialization
        var attr = x.attributes;
        for (var s, i = 0; i < attr.length; i++) {
            if (attr[i].nodeName.match(/^on|^(?:group|id)$/))
                continue;

            s = attr[i].nodeName.split(".");
            if (s.length == 2)
                this.$signalElements.push(s);

            this[attr[i].nodeName] = attr[i].nodeValue;
        }
    };

    this.$destroy = function(){
        this.$signalElements = null;
        apf.StateServer.removeState(this);
        if (this.group)
            apf.StateServer.removeGroup(this.group, this);
    };
});

// #endif
