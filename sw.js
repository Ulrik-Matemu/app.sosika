if(!self.define){let e,s={};const n=(n,t)=>(n=new URL(n+".js",t).href,s[n]||new Promise((s=>{if("document"in self){const e=document.createElement("script");e.src=n,e.onload=s,document.head.appendChild(e)}else e=n,importScripts(n),s()})).then((()=>{let e=s[n];if(!e)throw new Error(`Module ${n} didn’t register its module`);return e})));self.define=(t,i)=>{const r=e||("document"in self?document.currentScript.src:"")||location.href;if(s[r])return;let c={};const o=e=>n(e,r),l={module:{uri:r},exports:c,require:o};s[r]=Promise.all(t.map((e=>l[e]||o(e)))).then((e=>(i(...e),c)))}}define(["./workbox-4f1513ac"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/index-f0oiTt1e.css",revision:null},{url:"assets/index-nenJy1yj.js",revision:null},{url:"index.html",revision:"3611b256d2036df66e7546dd121d517a"},{url:"registerSW.js",revision:"98dc2c731c2578448198ac6c9a687ff9"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html"))),e.registerRoute((({request:e})=>"document"===e.destination),new e.NetworkFirst({cacheName:"html-cache",plugins:[]}),"GET"),e.registerRoute((({request:e})=>["style","script","worker"].includes(e.destination)),new e.StaleWhileRevalidate({cacheName:"assets-cache",plugins:[]}),"GET")}));
