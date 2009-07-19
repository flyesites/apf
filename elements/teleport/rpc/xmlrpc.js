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

// #ifdef __TP_RPC_XMLRPC
// #define __TP_RPC 1

/**
 * Implementation of the XML-RPC protocol as a module for the RPC
 * plugin of apf.teleport.
 * Example:
 * Ajax.org Markup Language
 * <code>
 *  <a:teleport>
 *      <a:rpc id="comm" protocol="xmlrpc">
 *          <a:method 
 *            name    = "searchProduct" 
 *            receive = "processSearch" />
 *          <a:method 
 *            name = "loadProduct" />
 *      </a:rpc>
 *  </a:teleport>
 *
 *  <a:script>
 *      //This function is called when the search returns
 *      function processSearch(data, state, extra){
 *          alert(data)
 *      }
 *
 *      //Execute a search for the product car
 *      comm.searchProduct('car', 10);
 *  </a:script>
 * </code>
 *
 * @constructor
 *
 * @addenum rpc[@protocol]:xmlrpc
 *
 * @inherits apf.Class
 * @inherits apf.BaseComm
 * @inherits apf.http
 * @inherits apf.rpc
 *
 * @author      Ruben Daniels (ruben AT javeline DOT com)
 * @version     %I%, %G%
 * @since       0.4
 *
 * @default_private
 */
apf.xmlrpc = function(){
    this.supportMulticall = true;
    this.multicall        = false;
    this.mcallname        = "system.multicall";
    this.method           = "POST";
    this.useXML           = true;
    
    this.namedArguments   = false;
    
    // Register Communication Module
    apf.teleport.register(this);
    
    // Stand Alone
    if (!this.uniqueId) {
        apf.makeClass(this);
        this.implement(apf.BaseComm, apf.http, apf.rpc);
    }
    
    // Serialize Objects
    var serialize = {
        host: this,
        
        object: function(o){
            var wo = o;//.valueOf();
            retstr = "<struct>";
            
            for (prop in wo) {
                if (typeof wo[prop] != "function" && prop != "type") {
                    retstr += "<member><name>" + prop + "</name><value>"
                        + this.host.doSerialize(wo[prop]) + "</value></member>";
                }
            }
            retstr += "</struct>";
            
            return retstr;
        },
        
        string: function(s){
            //<![CDATA[***your text here***]]>
            //return "<string><![CDATA[" + s.replace(/\]\]\>/g, "").replace(/\<\!\[\CDATA\[/g, "") + "]]></string>";//.replace(/</g, "&lt;").replace(/&/g, "&amp;")
            return "<string><![CDATA[" + s.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;").replace(/>/g, "&gt;") + "]]></string>";
            //var str = "<string>" + s.replace(/\&/g, "&amp;").replace(/\</g, "&lt;").replace(/\>/g, "&gt;") + "</string>";//.replace(/</g, "&lt;").replace(/&/g, "&amp;")
            return str;
        },
        
        number: function(i){
            if (i == parseInt(i)) {
                return "<int>" + i + "</int>";
            }
            else 
                if (i == parseFloat(i)) {
                    return "<double>" + i + "</double>";
                }
                else {
                    return this["boolean"](false);
                }
        },
        
        "boolean": function(b){
            if (b == true) 
                return "<boolean>1</boolean>";
            else 
                return "<boolean>0</boolean>";
        },
        
        date: function(d){
            //Could build in possibilities to express dates
            //in weeks or other iso8601 possibillities
            //hmmmm ????
            //19980717T14:08:55
            return "<dateTime.iso8601>" + doYear(d.getUTCYear())
                + doZero(d.getMonth()) + doZero(d.getUTCDate()) + "T"
                + doZero(d.getHours()) + ":" + doZero(d.getMinutes()) + ":"
                + doZero(d.getSeconds()) + "</dateTime.iso8601>";
            
            function doZero(nr){
                nr = String("0" + nr);
                return nr.substr(nr.length - 2, 2);
            }
            
            function doYear(year){
                if (year > 9999 || year < 0) 
                    XMLRPC.handleError(new Error(apf.formatErrorString(1085,
                        null, "XMLRPC serialization", "Unsupported year: " + year)));
                
                year = String("0000" + year)
                return year.substr(year.length - 4, 4);
            }
        },
        
        array: function(a){
            var retstr = "<array><data>";
            for (var i = 0; i < a.length; i++) {
                retstr += "<value>";
                retstr += this.host.doSerialize(a[i])
                retstr += "</value>";
            }
            return retstr + "</data></array>";
        }
    }
    
    this.getSingleCall = function(name, args, obj){
        obj.push({
            m: name,
            p: args
        });
    }
    
    this.doSerialize = function(args){
        if (typeof args == "function") {
            throw new Error(apf.formatErrorString(1086, null, "XMLRPC serialization", "Cannot Parse functions"));
        }
        else 
            if (apf.isNot(args)) 
                return serialize["boolean"](false);
        
        return serialize[args.dataType || "object"](args);
    }
    
    // Create message to send
    this.serialize = function(functionName, args){
        //Construct the XML-RPC message
        var message = '<?xml version="1.0" encoding=\"UTF-8\"?><methodCall><methodName>'
            + functionName + '</methodName><params>';
        for (var i = 0; i < args.length; i++) {
            message += '<param><value>' + this.doSerialize(args[i]) + '</value></param>';
        }
        message += '</params></methodCall>';
        
        return message;
    }
    
    this.unserialize = function(data){
        var ret, i;
        
        switch (data.tagName) {
            case "string":
                if (apf.isGecko) {
                    data = (new XMLSerializer()).serializeToString(data);
                    data = data.replace(/^\<string\>/, '');
                    data = data.replace(/\<\/string\>$/, '');
                    data = data.replace(/\&lt;/g, "<");
                    data = data.replace(/\&gt;/g, ">");
                    
                    return data;
                }
                
                return (data.firstChild) ? data.firstChild.nodeValue : "";
                break;
            case "int":
            case "i4":
            case "double":
                return (data.firstChild) ? new Number(data.firstChild.nodeValue) : 0;
                break;
            case "dateTime.iso8601":
                /*
             Have to read the spec to be able to completely
             parse all the possibilities in iso8601
             07-17-1998 14:08:55
             19980717T14:08:55
             */
                var sn = apf.dateSeparator;
                
                if (/^(\d{4})(\d{2})(\d{2})T(\d{2}):(\d{2}):(\d{2})/
                  .test(data.firstChild.nodeValue)) {
                    ;//data.text)){
                    return new Date(RegExp.$2 + sn + RegExp.$3 + sn +
                    RegExp.$1 +
                    " " +
                    RegExp.$4 +
                    ":" +
                    RegExp.$5 +
                    ":" +
                    RegExp.$6);
                }
                else {
                    return new Date();
                }
                
                break;
            case "array":
                data = apf.getNode(data, [0]);
                
                if (data && data.tagName == "data") {
                    ret = new Array();
                    
                    var i = 0;
                    while (child = apf.getNode(data, [i++])) {
                        ret.push(this.unserialize(child));
                    }
                    
                    return ret;
                }
                else {
                    this.handleError(new Error(apf.formatErrorString(1087, null, "", "Malformed XMLRPC Message")));
                    return false;
                }
                break;
            case "struct":
                ret = {};
                
                var i = 0;
                while (child = apf.getNode(data, [i++])) {
                    if (child.tagName == "member") {
                        ret[apf.getNode(child, [0]).firstChild.nodeValue] =
                            this.unserialize(apf.getNode(child, [1]));
                    }
                    else {
                        this.handleError(new Error(apf.formatErrorString(1087, null, "", "Malformed XMLRPC Message2")));
                        return false;
                    }
                }
                return ret;
                break;
            case "boolean":
                return Boolean(isNaN(parseInt(data.firstChild.nodeValue))
                    ? (data.firstChild.nodeValue == "true")
                    : parseInt(data.firstChild.nodeValue))
                break;
            case "base64":
                return apf.crypt.Base64.decode(data.firstChild.nodeValue);
                break;
            case "value":
                child = apf.getNode(data, [0]);
                return (!child) ? ((data.firstChild)
                    ? new String(data.firstChild.nodeValue) : "")
                    : this.unserialize(child);
                break;
            default:
                throw new Error(apf.formatErrorString(1088, null, "", "Malformed XMLRPC Message: " + data.tagName));
                return false;
                break;
        }
    }
    
    // Check Received Data for errors
    this.isValid = function(extra){
        var data = extra.data;
        
        if (apf.getNode(data, [0]).tagName == "fault") {
            if (!apf.isSafari) {
                var nr = data.selectSingleNode("//member[name/text()='faultCode']/value/int/text()").nodeValue;
                var msg = "\n" + data.selectSingleNode("//member[name/text()='faultString']/value/string/text()").nodeValue;
            }
            else {
                nr = msg = ""
            }
            
            extra.message = msg;
            return false;
        }
        
        extra.data = apf.getNode(data, [0, 0, 0]);
        
        return true;
    }
}

// #endif
