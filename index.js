import React from "react";
import { omit } from "ramda";

function isPlainObject(o) {
   return (o === null || Array.isArray(o) || typeof o == 'function' || o.constructor === Date ) ?
           false
          :(typeof o == 'object');
}

function isFunction(functionToCheck) {
 return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

function resolveProp(prop, context) {
    // If it's not an object, just return.
    if (!isPlainObject(prop)){
        return prop
    }
    // Check if the prop should be resolved a variable.
    if (prop.variable){
        return resolveVariable(prop, context)
    }
    // Check if the prop should be resolved as an arrow function.
    if (prop.arrow){
        return (...args) => prop.arrow
    }
    // If none of the special properties are present, do nothing.
    return prop
}

function resolveVariable(prop, context){
    // Resolve the function.
    const variable = getDescendantProp(window, prop.variable)
    // If it's not there, raise an error.
    if(variable === undefined){
        throw new Error("No match for [" + prop.variable + "] in the global window object.")
    }
    // If it's a function, add context.
    if(isFunction(variable) && context){
        return (...args) => variable(...args, context)
    }
    // Otherwise, use the variable as-is.
    return variable
}

function getDescendantProp(obj, desc) {
    const arr = desc.split(".");
    while(arr.length && (obj = obj[arr.shift()]));
    return obj;
}

function resolveProps(props, functionalProps, context){
    let nProps = Object.assign({}, props);
    for(let prop of functionalProps) {
        if (nProps[prop]) {
            nProps[prop] = resolveProp(nProps[prop], context);
        }
    }
    return nProps
}

function renderComponent(props){

    const item = React.createElement(
        window[props.item.namespace][props.item.type],
        omit(["setProps", "children"], props.item.props),
        props.item.props.children
   )
    return item
}

export {
    resolveProp,
    resolveProps,
    getDescendantProp
};