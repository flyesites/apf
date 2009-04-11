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
// #ifdef __JREPEAT || __INC_ALL
// #define __WITH_DATABINDING 1

/**
 * Element that defines a template of jml which is repeated for a list of 
 * selected {@link term.datanode data node}s. Each template instance is databound to the
 * same {@link term.datanode data node}.
 * Example:
 * Simple example of some jml which is repeated. The button removes an item
 * from the model when pressed.
 * <code>
 *   <j:model id="mdlExample">
 *      <data>
 *          <item>test1</item>
 *          <item>test2</item>
 *          <item>test3</item>
 *          <item>test4</item>
 *          <item>test5</item>
 *          <item>test6</item>
 *      </data>
 *  </j:model>
 *  
 *  <j:repeat id="rpExample" model="mdlExample" nodeset="item">
 *      <j:label ref="text()" />
 *      <j:button>ok</j:button>
 *  </j:repeat>
 *
 *  <j:button onclick="
 *      jpf.xmldb.removeNode(mdlExample.data.childNodes[1]);
 *  ">remove item</j:button>
 * </code>
 *
 * @constructor
 * @define repeat
 * @allowchild {anyjml}
 * @addnode elements
 *
 * @inherits jpf.DataBinding
 *
 * @author      Ruben Daniels
 * @version     %I%, %G%
 * @since       0.9
 */

jpf.repeat = jpf.component(jpf.NODE_VISIBLE, function(){
    this.$focussable     = false; // This object can get the focus
    this.canHaveChildren = true;

    this.caching = true;
    this.traverse = "node()";
    
    /**
     * @attribute {String} nodeset the xpath query which selects the nodes; template is rendered for each of them.
     */
    this.$propHandlers["nodeset"] = function(value){
        this.traverse = value;
    };
    
    /**** Private methods ****/
    
    /**
     * @private
     */
    var nodes  = {};
    this.addItem = function(xmlNode, beforeNode, nr){
        var Lid = jpf.xmldb.nodeConnect(this.documentId, xmlNode, null, this);
        var htmlNode = this.oExt.insertBefore(document.createElement("div"), beforeNode || null);
        var oItem = nodes[Lid] = {
            childNodes: [],
            hasFeature: function(){
                return 0
            },
            dispatchEvent : jpf.K,
            oExt: htmlNode
        };
        
        //Create JML Nodes
        var jmlNode = this.template.cloneNode(true);
        jmlNode.setAttribute("model", "#" + this.name + ":select:(" + this.traverse + ")[" + (nr + 1) + "]");
        jpf.JmlParser.parseChildren(jmlNode, htmlNode, oItem);
    };
    
    /**
     * @private
     */
    this.removeItem = function(Lid){
        Lid += "|" + this.uniqueId; 
        var oItem = nodes[Lid];
        var children = oItem.childNodes;
        for (var i = children.length - 1; i >= 0; i--) {
            children[i].destroy(true);
        }
        jpf.removeNode(oItem.oExt);
        delete nodes[Lid];
    };
    
    /**
     * Clears the loaded data from this element.
     */
    this.clear = function(){
        var Lid;
        for (Lid in nodes) {
            this.removeItem(Lid);
        }
    };
    
    /**** Databinding ****/
    
    /**
     * @private 
     */
    this.getCache = function(){
        return false;
    };
    
    this.$load = function(XMLRoot){
        //Add listener to XMLRoot Node
        jpf.xmldb.addNodeListener(XMLRoot, this);
        
        var children = XMLRoot.selectNodes(this.traverse);
        for (var i = 0; i < children.length; i++) {
            this.addItem(children[i], null, i);
        }
        
        jpf.JmlParser.parseLastPass();
    };
    
    /**
     * @private 
     */
    this.isTraverseNode = function(xmlNode){
        var nodes = this.xmlRoot.selectNodes(this.traverse);
        for (var i = 0; i < nodes.length; i++)
            if (nodes[i] == xmlNode)
                return true;
        
        return false;
    }
    
    this.$xmlUpdate = function(action, xmlNode, listenNode, UndoObj){
        var Lid = xmlNode.getAttribute(jpf.xmldb.xmlIdTag);
        if (!this.isTraverseNode(xmlNode)) 
            return;
        
        var htmlNode = nodes[Lid];
        
        //Check Move -- if value node isn't the node that was moved then only perform a normal update
        if (action == "move" && foundNode == startNode) {
            var isInThis = jpf.xmldb.isChildOf(this.xmlRoot, xmlNode.parentNode, true);
            var wasInThis = jpf.xmldb.isChildOf(this.xmlRoot, UndoObj.pNode, true);
            
            //Move if both previous and current position is within this object
            if (isInThis && wasInThis) {
                //xmlNode, htmlNode
                //Not supported right now
            }
            
            //Add if only current position is within this object
            else if (isInThis) 
                action = "add";
            
            //Remove if only previous position is within this object
            else if (wasInThis) 
                action = "remove";
        }
        else if (action == "move-away") {
            var goesToThis = jpf.xmldb.isChildOf(this.xmlRoot, UndoObj.parent, true);
            if (!goesToThis) 
                action = "remove";
        }
        
        if (action == "remove") {
            this.removeItem(Lid);
        }
        else if (action.match(add / insert)) {
            this.addItem(xmlNode, null, 5); //HACK, please determine number by position of xmlnode
            jpf.JmlParser.parseLastPass();
        }
        else if (action == "synchronize") {
        
        }
    };
    
    /**** Init ****/
    
    this.$draw = function(){
        this.oExt = this.pHtmlNode.appendChild(this.oExt 
            || document.createElement("div"));
        this.oInt = this.oExt;
    };
    
    this.$loadJml = function(x){
        this.template = x;
        
        if (!this.name) {
            this.name = "repeat" + this.uniqueId;
            jpf.setReference(this.name, this);
        }
    };
    
    this.$destroy = function(){};
}).implement(
    jpf.DataBinding
);

// #endif
