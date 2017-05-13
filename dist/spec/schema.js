"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
/**
 * strings for elements in property path
 * that do not have names
 */
const PATH_MARKERS = {
    ARRAY: '_',
    HASH: '[key: string]'
};
/**
 * Given a tyranid schema, produce an object schema
 * to insert into the Open API spec.
 *
 * @param def a tyranid collection schema schema object
 */
function schema(def) {
    const opts = utils_1.options(def);
    const name = opts.name || def.name;
    const pascalName = utils_1.pascal(name);
    /**
     * add direct check for organizationId for now,
     * should have hook functions later
     */
    if (!('organizationId' in def.fields)) {
        return utils_1.error(`
      organizationId property must exist on collection
      to expose to public api, it does not exist on collection ${def.name}
    `);
    }
    const out = {
        name,
        pascalName,
        id: def.id,
        schema: {
            ['x-tyranid-openapi-collection-id']: def.id,
            type: 'object',
            properties: schemaObject(def.fields, def.name)
        }
    };
    return out;
}
exports.schema = schema;
/**
 * extend a given path with a new property
 *
 * @param path current path
 * @param next name of next property
 */
function extendPath(next, path) {
    if (!path)
        return next;
    return `${path}.${next}`;
}
/**
 * Convert hash of tyranid fields to hash of Open API schema
 *
 * @param fields hash of tyranid field instances
 * @param path property path in schema of current field hash
 */
function schemaObject(fields, path) {
    const properties = {};
    utils_1.each(fields, (field, name) => {
        const prop = schemaType(field, extendPath(name, path));
        if (prop)
            properties[name] = prop;
    });
    return properties;
}
/**
 * Translate a tyranid field to a Open API definition
 *
 * @param field tyranid schema field
 * @param path property path in schema of current field
 */
function schemaType(field, path) {
    if (field.name !== '_id' && !include(field, path))
        return;
    // TODO: should links be refs?
    const type = field.def.link
        ? 'string'
        : field.def.is;
    const opts = utils_1.options(field.def);
    const out = {
        ['x-tyranid-openapi-name-path']: field.namePath.name
    };
    switch (type) {
        /**
         * string aliases
         */
        case 'password':
        case 'url':
        case 'string':
        case 'uid':
        case 'mongoid':
        case 'date':
        case 'email': {
            Object.assign(out, { type: 'string' });
            break;
        }
        case 'float':
        case 'double': {
            Object.assign(out, {
                type: 'number'
            });
            break;
        }
        /**
         * pass through types from tyranid
         */
        case 'boolean':
        case 'integer': {
            Object.assign(out, { type });
            break;
        }
        /**
         * array types
         */
        case 'array': {
            const element = field.of;
            if (!element) {
                return utils_1.error(`
          field "${path}" is of type \`array\`
          but missing an \`of\` property
        `);
            }
            const itemType = schemaType(element, extendPath(PATH_MARKERS.ARRAY, path));
            if (itemType) {
                Object.assign(out, {
                    type: 'array',
                    items: itemType
                });
            }
            break;
        }
        /**
         * nested objects
         */
        case 'object': {
            const keys = field.keys;
            const values = field.of;
            const subfields = field.fields;
            Object.assign(out, {
                type: 'object'
            });
            /**
             * if the sub object is a hash
             */
            if (keys) {
                if (!values) {
                    return utils_1.error(`
            field "${path}" is of type \`object\` and has a keys
            property but no values property.
          `);
                }
                const subType = schemaType(values, extendPath(PATH_MARKERS.HASH, path));
                if (subType)
                    out.additionalProperties = subType;
                break;
            }
            /**
             * if the sub object has a defined schema
             */
            if (!subfields) {
                return utils_1.error(`field "${path}" is of type \`object\` but
          has no \`fields\` property`);
            }
            const subType = schemaObject(subfields, path);
            if (subType)
                out.properties = subType;
            break;
        }
        default: return utils_1.error(`field "${path}" is of unsupported type: ${type}`);
    }
    /**
     * add formats
     */
    switch (type) {
        case 'date':
        case 'password':
        case 'float':
        case 'double': {
            out.format = type;
            break;
        }
        case 'integer': {
            out.format = 'i32';
            break;
        }
    }
    /**
     * add note from schema
     */
    if (opts.note || field.def.note) {
        out.description = (opts.note || field.def.note || '').replace(/\t+/mg, '');
    }
    return out;
}
const INCLUDE_CACHE = {};
/**
 * Include field in schema
 *
 * @param field tyranid field instance
 */
function include(field, path) {
    const name = field.name;
    if (path in INCLUDE_CACHE)
        return INCLUDE_CACHE[path];
    if ((field.fields && utils_1.each(field.fields, include)) ||
        (field.of && include(field.of, extendPath(name, path))) ||
        (field.def.openAPI))
        return INCLUDE_CACHE[path] = true;
    INCLUDE_CACHE[path] = false;
}
//# sourceMappingURL=schema.js.map