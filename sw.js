if(!self.define){let e,s={};const n=(n,i)=>(n=new URL(n+".js",i).href,s[n]||new Promise((s=>{if("document"in self){const e=document.createElement("script");e.src=n,e.onload=s,document.head.appendChild(e)}else e=n,importScripts(n),s()})).then((()=>{let e=s[n];if(!e)throw new Error(`Module ${n} didn’t register its module`);return e})));self.define=(i,r)=>{const t=e||("document"in self?document.currentScript.src:"")||location.href;if(s[t])return;let c={};const o=e=>n(e,t),l={module:{uri:t},exports:c,require:o};s[t]=Promise.all(i.map((e=>l[e]||o(e)))).then((e=>(r(...e),c)))}}define(["./workbox-4f1513ac"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/index-D8Sn4w2r.js",revision:null},{url:"assets/index-DwnKnuFn.css",revision:null},{url:"firebase-messaging-sw.js",revision:"e8a9fde08ae763ea6827edbc6177761f"},{url:"index.html",revision:"b8a1e48d3ac9b2128e4c253ee8f27eaa"},{url:"registerSW.js",revision:"98dc2c731c2578448198ac6c9a687ff9"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html"))),e.registerRoute((({request:e})=>"document"===e.destination),new e.NetworkFirst({cacheName:"html-cache",plugins:[]}),"GET"),e.registerRoute((({request:e})=>["style","script","worker"].includes(e.destination)),new e.StaleWhileRevalidate({cacheName:"assets-cache",plugins:[]}),"GET")}));
