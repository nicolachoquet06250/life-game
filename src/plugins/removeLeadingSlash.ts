import type {PluginOption} from "vite";

export default () => ({
    name: 'remove-leading-slash',
    transformIndexHtml: (html) =>  html.replace(/(href|src)="\.\//g, '$1="'),
} as PluginOption);