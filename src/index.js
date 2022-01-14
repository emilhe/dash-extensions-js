import React from "react";
import {
    CheckedComponent,
    isSimpleComponent,
    NOT_LOADING,
    Registry,
    stringifyId
} from "./dashSnippets";
import {dissoc, isEmpty, type} from "ramda";

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

function renderDashComponent(component, index=null) {
    // Nothing to render.
    if (isEmpty(component)) {
        return null;
    }
    // Simple stuff such as strings.
    if (isSimpleComponent(component)) {
        return component;
    }
    // Array of stuff.
    if(Array.isArray(component)){
        return component.map((item, i) => renderDashComponent(item, i))
    }
    // If we get here, we need to render an actual Dash component.
    const element = Registry.resolve(component);
    const props = dissoc('children', component.props);
    const children = renderDashComponent(component.props.children);
    // Make sure that id is a string.
    if (type(props.id) === 'Object') {
        // Turn object ids (for wildcards) into unique strings.
        // Because of the `dissoc` above we're not mutating the layout,
        // just the id we pass on to the rendered component
        props.id = stringifyId(props.id);
    }
    // Set loading as not-loading, and bind a dummy setProps handler.
    const extraProps = {
        loading_state: NOT_LOADING,
        setProps: () => null,
    };
    // Render the component.
    return <CheckedComponent
        children={children}
        element={element}
        props={props}
        extraProps={extraProps}
        type={component.type}
        key={index}
    />
}

function renderDashComponents(props, propsToRender){
    for (let i = 0; i < propsToRender.length; i++) {
        let key = propsToRender[i];
        if (props.hasOwnProperty(key)){
            props[key] = renderDashComponent(props[key]);
        }
    }
    return props
}

export {
    resolveProp,
    resolveProps,
    getDescendantProp,
    renderDashComponent,
    renderDashComponents
};
