if(!self.define){let e,s={};const i=(i,n)=>(i=new URL(i+".js",n).href,s[i]||new Promise((s=>{if("document"in self){const e=document.createElement("script");e.src=i,e.onload=s,document.head.appendChild(e)}else e=i,importScripts(i),s()})).then((()=>{let e=s[i];if(!e)throw new Error(`Module ${i} didn’t register its module`);return e})));self.define=(n,r)=>{const t=e||("document"in self?document.currentScript.src:"")||location.href;if(s[t])return;let c={};const o=e=>i(e,t),l={module:{uri:t},exports:c,require:o};s[t]=Promise.all(n.map((e=>l[e]||o(e)))).then((e=>(r(...e),c)))}}define(["./workbox-4f1513ac"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/index-BT9cAOTj.css",revision:null},{url:"assets/index-DZJL-PCv.js",revision:null},{url:"firebase-messaging-sw.js",revision:"f5f427d59be2809c136bf98e125d4120"},{url:"index.html",revision:"922acb30b0c3b0c0ef69851694660067"},{url:"registerSW.js",revision:"98dc2c731c2578448198ac6c9a687ff9"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html"))),e.registerRoute((({request:e})=>"document"===e.destination),new e.NetworkFirst({cacheName:"html-cache",plugins:[]}),"GET"),e.registerRoute((({request:e})=>["style","script","worker"].includes(e.destination)),new e.StaleWhileRevalidate({cacheName:"assets-cache",plugins:[]}),"GET")}));
