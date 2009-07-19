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

// #ifdef __JCHECKBOX || __INC_ALL
// #define __WITH_PRESENTATION 1
// #define __JBASEBUTTON 1

/**
 * Element displaying a clickable rectangle having two states which
 * can be toggled by user interaction.
 * Example:
 * <code>
 * <a:checkbox values="full|empty">the glass is full</a:checkbox>
 * </code>
 *
 * @constructor
 *
 * @define checkbox
 * @addnode elements
 *
 * @author      Ruben Daniels (ruben AT javeline DOT com)
 * @version     %I%, %G%
 * @since       0.4
 *
 * @inherits apf.Presentation
 * @inherits apf.BaseButton
 * @inherits apf.Validation
 * @inherits apf.XForms
 * @inherits apf.DataBinding
 *
 * @binding value  Determines the way the value for the element is retrieved 
 * from the bound data.
 * Example:
 * Sets the value of the checkbox based on data loaded into this component.
 * <code>
 *  <a:checkbox>
 *      <a:bindings>
 *          <a:value select="@answer" />
 *      </a:bindings>
 *  </a:checkbox>
 * </code>
 * Example:
 * A shorter way to write this is:
 * <code>
 *  <a:checkbox ref="@answer" />
 * </code>
 */
apf.checkbox = apf.component(apf.NODE_VISIBLE, function(){
    // #ifdef __WITH_EDITMODE
    this.editableParts = {"main" : [["label","text()"]]};
    // #endif

    //Options
    this.$notfromext = true;
    this.$focussable = true; // This object can get the focus
    this.checked     = false;

    /**** Properties and Attributes ****/

    this.$booleanProperties["checked"] = true;
    this.$supportedProperties.push("value", "checked", "label", "values");

    /**
     * @attribute {String}  value    the value of this element.
     */
    this.$propHandlers["value"] = function(value){
        value = (typeof value == "string" ? value.trim() : value);

        this.checked = (value !== undefined
            && value.toString() == this.$values[0].toString());

        if (value !== null && value.toString() == this.$values[0].toString())
            this.$setStyleClass(this.oExt, this.baseCSSname + "Checked");
        else
            this.$setStyleClass(this.oExt, "", [this.baseCSSname + "Checked"]);
    };

    /**
     * @attribute {Boolean} checked  whether the element is in the checked state.
     */
    this.$propHandlers["checked"] = function(value) {
        if (!this.$values) {
            if (this.$aml.getAttribute("values"))
                this.$propHandler["values"].call(this, this.$aml.getAttribute("values"));
            else
                this.$values = [false, true];
        }
        this.setProperty("value", this.$values[value ? 0 : 1]);
    };

    /**
     * @attribute {String}  label    the caption of the label explaining what
     * the meaning of the checked state of this element is.
     */
    this.$propHandlers["label"] = function(value){
        apf.xmldb.setNodeValue(
            this.$getLayoutNode("main", "label", this.oExt), value);
    };

    /**
     * @attribute {String}  values   a pipe seperated list of two values which
     * correspond to the two states of the checkbox. The first for the checked
     * state, the second for the unchecked state. Defaults to "true|false".
     */
    this.$propHandlers["values"] = function(value){
        this.$values = typeof value == "string"
            ? value.split("\|")
            : (value || [1, 0]);
    };

    /**** Public Methods ****/

    /**
     * Sets the value of this element. This should be one of the values
     * specified in the values attribute.
     * @param {String} value the new value of this element
     */
    this.setValue = function(value){
        if (!this.$values) return;
        this.setProperty("value", value);
    };

    /**
     * Returns the current value
     */
    this.getValue = function(){
        return this.xmlRoot ? this.$values[this.checked ? 0 : 1] : this.value;
    };

    /**
     * Sets the checked state and related value
     */
    this.check = function(){
        this.setProperty("value", this.$values[0]);
    };

    /**
     * Sets the unchecked state and related value
     */
    this.uncheck = function(){
        this.setProperty("value", this.$values[1]);
    };

    /**** Private state handling methods ****/

    this.$clear = function(){
        this.setProperty("value", this.$values[1]);
    }

    this.$enable = function(){
        if (this.oInt) this.oInt.disabled = false;
        this.$doBgSwitch(1);
    };

    this.$disable = function(){
        if (this.oInt) this.oInt.disabled = true;
        this.$doBgSwitch(4);
    };

    this.$setState = function(state, e, strEvent){
        if (this.disabled) return;

        this.$doBgSwitch(this.states[state]);
        this.$setStyleClass(this.oExt, (state != "Out" ? this.baseCSSname + state : ""),
            [this.baseCSSname + "Down", this.baseCSSname + "Over"]);
        this.state = state; // Store the current state so we can check on it coming here again.

        this.dispatchEvent(strEvent, e);

        /*if (state == "Down")
            apf.cancelBubble(e, this);
        else
            e.cancelBubble = true;*/
    };

    this.$clickHandler = function(){
        //this.checked = !this.checked;
        this.change(this.$values[(!this.checked) ? 0 : 1]);
        
        //#ifdef __WITH_VALIDATION
        this.validate(true);
        //#endif
        
        return true;
    };

    /**** Init ****/

    this.$draw = function(){
        //Build Main Skin
        this.oExt = this.$getExternal();
        this.oInt = this.$getLayoutNode("main", "input", this.oExt);

        this.$setupEvents();
    };

    this.$loadAml = function(x){
        if (!this.label && x.firstChild)
            this.setProperty("label", x.firstChild.nodeValue);

        if (this.$values === undefined)
            this.$values = [1, 0];
    };

    //#ifdef __WITH_SKIN_CHANGE
    this.$skinchange = function(){
        if (this.label)
            this.$propHandlers["label"].call(this, this.label);
    }
    //#endif
}).implement(
    //#ifdef __WITH_VALIDATION || __WITH_XFORMS
    apf.Validation,
    //#endif
    //#ifdef __WITH_XFORMS
    apf.XForms,
    //#endif
    // #ifdef __WITH_DATABINDING
    apf.DataBinding,
    // #endif
    apf.Presentation,
    apf.BaseButton
);

// #endif
