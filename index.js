import {dissoc, has, includes, isEmpty, mergeRight, type} from "ramda";
import ReactPropTypesSecret from "prop-types/lib/ReactPropTypesSecret";
import PropTypes from "prop-types";
import React from "react";

// region Copied from Dash main repo

/**
 * Assert that the values match with the type specs.
 *
 * @param {object} typeSpecs Map of name to a ReactPropType
 * @param {object} values Runtime values that need to be type-checked
 * @param {string} location e.g. "prop", "context", "child context"
 * @param {string} componentName Name of the component for error messages.
 * @param {?Function} getStack Returns the component stack.
 * @return {string} Any error message resulting from checking the types
 */
function checkPropTypes(
    typeSpecs,
    values,
    location,
    componentName,
    getStack = null
) {
    const errors = [];
    for (const typeSpecName in typeSpecs) {
        if (typeSpecs.hasOwnProperty(typeSpecName)) {
            let error;
            // Prop type validation may throw. In case they do, we don't want to
            // fail the render phase where it didn't fail before. So we log it.
            // After these have been cleaned up, we'll let them throw.
            try {
                // This is intentionally an invariant that gets caught. It's the same
                // behavior as without this statement except with a better message.
                if (typeof typeSpecs[typeSpecName] !== 'function') {
                    error = Error(
                        (componentName || 'React class') +
                            ': ' +
                            location +
                            ' type `' +
                            typeSpecName +
                            '` is invalid; ' +
                            'it must be a function, usually from the `prop-types` package, but received `' +
                            typeof typeSpecs[typeSpecName] +
                            '`.'
                    );
                    error.name = 'Invariant Violation';
                } else {
                    error = typeSpecs[typeSpecName](
                        values,
                        typeSpecName,
                        componentName,
                        location,
                        null,
                        ReactPropTypesSecret
                    );
                }
            } catch (ex) {
                error = ex;
            }
            if (error && !(error instanceof Error)) {
                errors.push(
                    (componentName || 'React class') +
                        ': type specification of ' +
                        location +
                        ' `' +
                        typeSpecName +
                        '` is invalid; the type checker ' +
                        'function must return `null` or an `Error` but returned a ' +
                        typeof error +
                        '. ' +
                        'You may have forgotten to pass an argument to the type checker ' +
                        'creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and ' +
                        'shape all require an argument).'
                );
            }
            if (error instanceof Error) {
                var stack = (getStack && getStack()) || '';

                errors.push(
                    'Failed ' + location + ' type: ' + error.message + stack
                );
            }
        }
    }
    return errors.join('\n\n');
}

function propTypeErrorHandler(message, props, type) {
    /*
     * propType error messages are constructed in
     * https://github.com/facebook/prop-types/blob/v15.7.2/factoryWithTypeCheckers.js
     * (Version 15.7.2)
     *
     * Parse these exception objects to remove JS source code and improve
     * the clarity.
     *
     * If wrong prop type was passed in, message looks like:
     *
     * Error: "Failed component prop type: Invalid component prop `animate` of type `number` supplied to `function GraphWithDefaults(props) {
     *   var id = props.id ? props.id : generateId();
     *   return react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(PlotlyGraph, _extends({}, props, {
     *     id: id
     *   }));
     * }`, expected `boolean`."
     *
     *
     * If a required prop type was omitted, message looks like:
     *
     * "Failed component prop type: The component prop `options[0].value` is marked as required in `function Checklist(props) {
     *    var _this;
     *
     *    _classCallCheck(this, Checklist);
     *
     *     _this = _possibleConstructorReturn(this, _getPrototypeOf(Checklist).call(this, props));
     *     _this.state = {
     *       values: props.values
     *     };
     *     return _this;
     *   }`, but its value is `undefined`."
     *
     */

    const messageParts = message.split('`');
    let errorMessage;
    if (includes('is marked as required', message)) {
        const invalidPropPath = messageParts[1];
        errorMessage = `${invalidPropPath} in ${type}`;
        if (props.id) {
            errorMessage += ` with ID "${props.id}"`;
        }
        errorMessage += ' is required but it was not provided.';
    } else if (includes('Bad object', message)) {
        /*
         * Handle .exact errors
         * https://github.com/facebook/prop-types/blob/v15.7.2/factoryWithTypeCheckers.js#L438-L442
         */
        errorMessage =
            message.split('supplied to ')[0] +
            `supplied to ${type}` +
            '.\nBad' +
            message.split('.\nBad')[1];
    } else if (
        includes('Invalid ', message) &&
        includes(' supplied to ', message)
    ) {
        const invalidPropPath = messageParts[1];

        errorMessage = `Invalid argument \`${invalidPropPath}\` passed into ${type}`;
        if (props.id) {
            errorMessage += ` with ID "${props.id}"`;
        }
        errorMessage += '.';

        /*
         * Not all error messages include the expected value.
         * In particular, oneOfType.
         * https://github.com/facebook/prop-types/blob/v15.7.2/factoryWithTypeCheckers.js#L388
         */
        if (includes(', expected ', message)) {
            const expectedPropType = message.split(', expected ')[1];
            errorMessage += `\nExpected ${expectedPropType}`;
        }

        /*
         * Not all error messages include the type
         * In particular, oneOfType.
         * https://github.com/facebook/prop-types/blob/v15.7.2/factoryWithTypeCheckers.js#L388
         */
        if (includes(' of type `', message)) {
            const invalidPropTypeProvided = message
                .split(' of type `')[1]
                .split('`')[0];
            errorMessage += `\nWas supplied type \`${invalidPropTypeProvided}\`.`;
        }

        if (has(invalidPropPath, props)) {
            /*
             * invalidPropPath may be nested like `options[0].value`.
             * For now, we won't try to unpack these nested options
             * but we could in the future.
             */
            const jsonSuppliedValue = JSON.stringify(
                props[invalidPropPath],
                null,
                2
            );
            if (jsonSuppliedValue) {
                if (includes('\n', jsonSuppliedValue)) {
                    errorMessage += `\nValue provided: \n${jsonSuppliedValue}`;
                } else {
                    errorMessage += `\nValue provided: ${jsonSuppliedValue}`;
                }
            }
        }
    } else {
        /*
         * Not aware of other prop type warning messages.
         * But, if they exist, then at least throw the default
         * react prop types error
         */
        throw new Error(message);
    }

    throw new Error(errorMessage);
}

function CheckedComponent(p) {
    const {element, extraProps, props, children, type} = p;

    const errorMessage = checkPropTypes(
        element.propTypes,
        props,
        'component prop',
        element
    );
    if (errorMessage) {
        propTypeErrorHandler(errorMessage, props, type);
    }

    return createElement(element, props, extraProps, children);
}

CheckedComponent.propTypes = {
    children: PropTypes.any,
    element: PropTypes.any,
    layout: PropTypes.any,
    props: PropTypes.any,
    extraProps: PropTypes.any,
    id: PropTypes.string
};

function createElement(element, props, extraProps, children) {
    const allProps = mergeRight(props, extraProps);
    if (Array.isArray(children)) {
        return React.createElement(element, allProps, ...children);
    }
    return React.createElement(element, allProps, children);
}

function stringifyId(id) {
    if (typeof id !== 'object') {
        return id;
    }
    const stringifyVal = v => (v && v.wild) || JSON.stringify(v);
    const parts = Object.keys(id)
        .sort()
        .map(k => JSON.stringify(k) + ':' + stringifyVal(id[k]));
    return '{' + parts.join(',') + '}';
}

const SIMPLE_COMPONENT_TYPES = ['String', 'Number', 'Null', 'Boolean'];
const isSimpleComponent = component => includes(type(component), SIMPLE_COMPONENT_TYPES);
const NOT_LOADING = {
    is_loading: false
};
const Registry = {
    resolve: component => {
        const {type, namespace} = component;

        const ns = window[namespace];

        if (ns) {
            if (ns[type]) {
                return ns[type];
            }

            throw new Error(`Component ${type} not found in ${namespace}`);
        }

        throw new Error(`${namespace} was not found.`);
    }
};


// endregion


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
    // Merge props.
    const allProps = {props: props, element: element, extraProps: extraProps, type: component.type, key: index}
    // Render the component.
    return React.createElement(CheckedComponent, allProps, children);
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
