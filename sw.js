try{self["workbox:core:7.2.0"]&&_()}catch{}const T=(a,...e)=>{let t=a;return e.length>0&&(t+=` :: ${JSON.stringify(e)}`),t},x=T;class l extends Error{constructor(e,t){const s=x(e,t);super(s),this.name=e,this.details=t}}const f={googleAnalytics:"googleAnalytics",precache:"precache-v2",prefix:"workbox",runtime:"runtime",suffix:typeof registration<"u"?registration.scope:""},C=a=>[f.prefix,a,f.suffix].filter(e=>e&&e.length>0).join("-"),N=a=>{for(const e of Object.keys(f))a(e)},U={updateDetails:a=>{N(e=>{typeof a[e]=="string"&&(f[e]=a[e])})},getGoogleAnalyticsName:a=>a||C(f.googleAnalytics),getPrecacheName:a=>a||C(f.precache),getPrefix:()=>f.prefix,getRuntimeName:a=>a||C(f.runtime),getSuffix:()=>f.suffix};function k(a,e){const t=e();return a.waitUntil(t),t}try{self["workbox:precaching:7.2.0"]&&_()}catch{}const E="__WB_REVISION__";function I(a){if(!a)throw new l("add-to-cache-list-unexpected-type",{entry:a});if(typeof a=="string"){const n=new URL(a,location.href);return{cacheKey:n.href,url:n.href}}const{revision:e,url:t}=a;if(!t)throw new l("add-to-cache-list-unexpected-type",{entry:a});if(!e){const n=new URL(t,location.href);return{cacheKey:n.href,url:n.href}}const s=new URL(t,location.href),r=new URL(t,location.href);return s.searchParams.set(E,e),{cacheKey:s.href,url:r.href}}class O{constructor(){this.updatedURLs=[],this.notUpdatedURLs=[],this.handlerWillStart=async({request:e,state:t})=>{t&&(t.originalRequest=e)},this.cachedResponseWillBeUsed=async({event:e,state:t,cachedResponse:s})=>{if(e.type==="install"&&t&&t.originalRequest&&t.originalRequest instanceof Request){const r=t.originalRequest.url;s?this.notUpdatedURLs.push(r):this.updatedURLs.push(r)}return s}}}class M{constructor({precacheController:e}){this.cacheKeyWillBeUsed=async({request:t,params:s})=>{const r=(s==null?void 0:s.cacheKey)||this._precacheController.getCacheKeyForURL(t.url);return r?new Request(r,{headers:t.headers}):t},this._precacheController=e}}let p;function W(){if(p===void 0){const a=new Response("");if("body"in a)try{new Response(a.body),p=!0}catch{p=!1}p=!1}return p}async function q(a,e){let t=null;if(a.url&&(t=new URL(a.url).origin),t!==self.location.origin)throw new l("cross-origin-copy-response",{origin:t});const s=a.clone(),n={headers:new Headers(s.headers),status:s.status,statusText:s.statusText},c=W()?s.body:await s.blob();return new Response(c,n)}const A=a=>new URL(String(a),location.href).href.replace(new RegExp(`^${location.origin}`),"");function P(a,e){const t=new URL(a);for(const s of e)t.searchParams.delete(s);return t.href}async function S(a,e,t,s){const r=P(e.url,t);if(e.url===r)return a.match(e,s);const n=Object.assign(Object.assign({},s),{ignoreSearch:!0}),c=await a.keys(e,n);for(const i of c){const o=P(i.url,t);if(r===o)return a.match(i,s)}}class D{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}const j=new Set;async function H(){for(const a of j)await a()}function F(a){return new Promise(e=>setTimeout(e,a))}try{self["workbox:strategies:7.2.0"]&&_()}catch{}function m(a){return typeof a=="string"?new Request(a):a}class B{constructor(e,t){this._cacheKeys={},Object.assign(this,t),this.event=t.event,this._strategy=e,this._handlerDeferred=new D,this._extendLifetimePromises=[],this._plugins=[...e.plugins],this._pluginStateMap=new Map;for(const s of this._plugins)this._pluginStateMap.set(s,{});this.event.waitUntil(this._handlerDeferred.promise)}async fetch(e){const{event:t}=this;let s=m(e);if(s.mode==="navigate"&&t instanceof FetchEvent&&t.preloadResponse){const c=await t.preloadResponse;if(c)return c}const r=this.hasCallback("fetchDidFail")?s.clone():null;try{for(const c of this.iterateCallbacks("requestWillFetch"))s=await c({request:s.clone(),event:t})}catch(c){if(c instanceof Error)throw new l("plugin-error-request-will-fetch",{thrownErrorMessage:c.message})}const n=s.clone();try{let c;c=await fetch(s,s.mode==="navigate"?void 0:this._strategy.fetchOptions);for(const i of this.iterateCallbacks("fetchDidSucceed"))c=await i({event:t,request:n,response:c});return c}catch(c){throw r&&await this.runCallbacks("fetchDidFail",{error:c,event:t,originalRequest:r.clone(),request:n.clone()}),c}}async fetchAndCachePut(e){const t=await this.fetch(e),s=t.clone();return this.waitUntil(this.cachePut(e,s)),t}async cacheMatch(e){const t=m(e);let s;const{cacheName:r,matchOptions:n}=this._strategy,c=await this.getCacheKey(t,"read"),i=Object.assign(Object.assign({},n),{cacheName:r});s=await caches.match(c,i);for(const o of this.iterateCallbacks("cachedResponseWillBeUsed"))s=await o({cacheName:r,matchOptions:n,cachedResponse:s,request:c,event:this.event})||void 0;return s}async cachePut(e,t){const s=m(e);await F(0);const r=await this.getCacheKey(s,"write");if(!t)throw new l("cache-put-with-no-response",{url:A(r.url)});const n=await this._ensureResponseSafeToCache(t);if(!n)return!1;const{cacheName:c,matchOptions:i}=this._strategy,o=await self.caches.open(c),h=this.hasCallback("cacheDidUpdate"),g=h?await S(o,r.clone(),["__WB_REVISION__"],i):null;try{await o.put(r,h?n.clone():n)}catch(u){if(u instanceof Error)throw u.name==="QuotaExceededError"&&await H(),u}for(const u of this.iterateCallbacks("cacheDidUpdate"))await u({cacheName:c,oldResponse:g,newResponse:n.clone(),request:r,event:this.event});return!0}async getCacheKey(e,t){const s=`${e.url} | ${t}`;if(!this._cacheKeys[s]){let r=e;for(const n of this.iterateCallbacks("cacheKeyWillBeUsed"))r=m(await n({mode:t,request:r,event:this.event,params:this.params}));this._cacheKeys[s]=r}return this._cacheKeys[s]}hasCallback(e){for(const t of this._strategy.plugins)if(e in t)return!0;return!1}async runCallbacks(e,t){for(const s of this.iterateCallbacks(e))await s(t)}*iterateCallbacks(e){for(const t of this._strategy.plugins)if(typeof t[e]=="function"){const s=this._pluginStateMap.get(t);yield n=>{const c=Object.assign(Object.assign({},n),{state:s});return t[e](c)}}}waitUntil(e){return this._extendLifetimePromises.push(e),e}async doneWaiting(){let e;for(;e=this._extendLifetimePromises.shift();)await e}destroy(){this._handlerDeferred.resolve(null)}async _ensureResponseSafeToCache(e){let t=e,s=!1;for(const r of this.iterateCallbacks("cacheWillUpdate"))if(t=await r({request:this.request,response:t,event:this.event})||void 0,s=!0,!t)break;return s||t&&t.status!==200&&(t=void 0),t}}class ${constructor(e={}){this.cacheName=U.getRuntimeName(e.cacheName),this.plugins=e.plugins||[],this.fetchOptions=e.fetchOptions,this.matchOptions=e.matchOptions}handle(e){const[t]=this.handleAll(e);return t}handleAll(e){e instanceof FetchEvent&&(e={event:e,request:e.request});const t=e.event,s=typeof e.request=="string"?new Request(e.request):e.request,r="params"in e?e.params:void 0,n=new B(this,{event:t,request:s,params:r}),c=this._getResponse(n,s,t),i=this._awaitComplete(c,n,s,t);return[c,i]}async _getResponse(e,t,s){await e.runCallbacks("handlerWillStart",{event:s,request:t});let r;try{if(r=await this._handle(t,e),!r||r.type==="error")throw new l("no-response",{url:t.url})}catch(n){if(n instanceof Error){for(const c of e.iterateCallbacks("handlerDidError"))if(r=await c({error:n,event:s,request:t}),r)break}if(!r)throw n}for(const n of e.iterateCallbacks("handlerWillRespond"))r=await n({event:s,request:t,response:r});return r}async _awaitComplete(e,t,s,r){let n,c;try{n=await e}catch{}try{await t.runCallbacks("handlerDidRespond",{event:r,request:s,response:n}),await t.doneWaiting()}catch(i){i instanceof Error&&(c=i)}if(await t.runCallbacks("handlerDidComplete",{event:r,request:s,response:n,error:c}),t.destroy(),c)throw c}}class d extends ${constructor(e={}){e.cacheName=U.getPrecacheName(e.cacheName),super(e),this._fallbackToNetwork=e.fallbackToNetwork!==!1,this.plugins.push(d.copyRedirectedCacheableResponsesPlugin)}async _handle(e,t){const s=await t.cacheMatch(e);return s||(t.event&&t.event.type==="install"?await this._handleInstall(e,t):await this._handleFetch(e,t))}async _handleFetch(e,t){let s;const r=t.params||{};if(this._fallbackToNetwork){const n=r.integrity,c=e.integrity,i=!c||c===n;s=await t.fetch(new Request(e,{integrity:e.mode!=="no-cors"?c||n:void 0})),n&&i&&e.mode!=="no-cors"&&(this._useDefaultCacheabilityPluginIfNeeded(),await t.cachePut(e,s.clone()))}else throw new l("missing-precache-entry",{cacheName:this.cacheName,url:e.url});return s}async _handleInstall(e,t){this._useDefaultCacheabilityPluginIfNeeded();const s=await t.fetch(e);if(!await t.cachePut(e,s.clone()))throw new l("bad-precaching-response",{url:e.url,status:s.status});return s}_useDefaultCacheabilityPluginIfNeeded(){let e=null,t=0;for(const[s,r]of this.plugins.entries())r!==d.copyRedirectedCacheableResponsesPlugin&&(r===d.defaultPrecacheCacheabilityPlugin&&(e=s),r.cacheWillUpdate&&t++);t===0?this.plugins.push(d.defaultPrecacheCacheabilityPlugin):t>1&&e!==null&&this.plugins.splice(e,1)}}d.defaultPrecacheCacheabilityPlugin={async cacheWillUpdate({response:a}){return!a||a.status>=400?null:a}};d.copyRedirectedCacheableResponsesPlugin={async cacheWillUpdate({response:a}){return a.redirected?await q(a):a}};class V{constructor({cacheName:e,plugins:t=[],fallbackToNetwork:s=!0}={}){this._urlsToCacheKeys=new Map,this._urlsToCacheModes=new Map,this._cacheKeysToIntegrities=new Map,this._strategy=new d({cacheName:U.getPrecacheName(e),plugins:[...t,new M({precacheController:this})],fallbackToNetwork:s}),this.install=this.install.bind(this),this.activate=this.activate.bind(this)}get strategy(){return this._strategy}precache(e){this.addToCacheList(e),this._installAndActiveListenersAdded||(self.addEventListener("install",this.install),self.addEventListener("activate",this.activate),this._installAndActiveListenersAdded=!0)}addToCacheList(e){const t=[];for(const s of e){typeof s=="string"?t.push(s):s&&s.revision===void 0&&t.push(s.url);const{cacheKey:r,url:n}=I(s),c=typeof s!="string"&&s.revision?"reload":"default";if(this._urlsToCacheKeys.has(n)&&this._urlsToCacheKeys.get(n)!==r)throw new l("add-to-cache-list-conflicting-entries",{firstEntry:this._urlsToCacheKeys.get(n),secondEntry:r});if(typeof s!="string"&&s.integrity){if(this._cacheKeysToIntegrities.has(r)&&this._cacheKeysToIntegrities.get(r)!==s.integrity)throw new l("add-to-cache-list-conflicting-integrities",{url:n});this._cacheKeysToIntegrities.set(r,s.integrity)}if(this._urlsToCacheKeys.set(n,r),this._urlsToCacheModes.set(n,c),t.length>0){const i=`Workbox is precaching URLs without revision info: ${t.join(", ")}
This is generally NOT safe. Learn more at https://bit.ly/wb-precache`;console.warn(i)}}}install(e){return k(e,async()=>{const t=new O;this.strategy.plugins.push(t);for(const[n,c]of this._urlsToCacheKeys){const i=this._cacheKeysToIntegrities.get(c),o=this._urlsToCacheModes.get(n),h=new Request(n,{integrity:i,cache:o,credentials:"same-origin"});await Promise.all(this.strategy.handleAll({params:{cacheKey:c},request:h,event:e}))}const{updatedURLs:s,notUpdatedURLs:r}=t;return{updatedURLs:s,notUpdatedURLs:r}})}activate(e){return k(e,async()=>{const t=await self.caches.open(this.strategy.cacheName),s=await t.keys(),r=new Set(this._urlsToCacheKeys.values()),n=[];for(const c of s)r.has(c.url)||(await t.delete(c),n.push(c.url));return{deletedURLs:n}})}getURLsToCacheKeys(){return this._urlsToCacheKeys}getCachedURLs(){return[...this._urlsToCacheKeys.keys()]}getCacheKeyForURL(e){const t=new URL(e,location.href);return this._urlsToCacheKeys.get(t.href)}getIntegrityForCacheKey(e){return this._cacheKeysToIntegrities.get(e)}async matchPrecache(e){const t=e instanceof Request?e.url:e,s=this.getCacheKeyForURL(t);if(s)return(await self.caches.open(this.strategy.cacheName)).match(s)}createHandlerBoundToURL(e){const t=this.getCacheKeyForURL(e);if(!t)throw new l("non-precached-url",{url:e});return s=>(s.request=new Request(e),s.params=Object.assign({cacheKey:t},s.params),this.strategy.handle(s))}}let b;const K=()=>(b||(b=new V),b);try{self["workbox:routing:7.2.0"]&&_()}catch{}const v="GET",R=a=>a&&typeof a=="object"?a:{handle:a};class w{constructor(e,t,s=v){this.handler=R(t),this.match=e,this.method=s}setCatchHandler(e){this.catchHandler=R(e)}}class G extends w{constructor(e,t,s){const r=({url:n})=>{const c=e.exec(n.href);if(c&&!(n.origin!==location.origin&&c.index!==0))return c.slice(1)};super(r,t,s)}}class Q{constructor(){this._routes=new Map,this._defaultHandlerMap=new Map}get routes(){return this._routes}addFetchListener(){self.addEventListener("fetch",e=>{const{request:t}=e,s=this.handleRequest({request:t,event:e});s&&e.respondWith(s)})}addCacheListener(){self.addEventListener("message",e=>{if(e.data&&e.data.type==="CACHE_URLS"){const{payload:t}=e.data,s=Promise.all(t.urlsToCache.map(r=>{typeof r=="string"&&(r=[r]);const n=new Request(...r);return this.handleRequest({request:n,event:e})}));e.waitUntil(s),e.ports&&e.ports[0]&&s.then(()=>e.ports[0].postMessage(!0))}})}handleRequest({request:e,event:t}){const s=new URL(e.url,location.href);if(!s.protocol.startsWith("http"))return;const r=s.origin===location.origin,{params:n,route:c}=this.findMatchingRoute({event:t,request:e,sameOrigin:r,url:s});let i=c&&c.handler;const o=e.method;if(!i&&this._defaultHandlerMap.has(o)&&(i=this._defaultHandlerMap.get(o)),!i)return;let h;try{h=i.handle({url:s,request:e,event:t,params:n})}catch(u){h=Promise.reject(u)}const g=c&&c.catchHandler;return h instanceof Promise&&(this._catchHandler||g)&&(h=h.catch(async u=>{if(g)try{return await g.handle({url:s,request:e,event:t,params:n})}catch(L){L instanceof Error&&(u=L)}if(this._catchHandler)return this._catchHandler.handle({url:s,request:e,event:t});throw u})),h}findMatchingRoute({url:e,sameOrigin:t,request:s,event:r}){const n=this._routes.get(s.method)||[];for(const c of n){let i;const o=c.match({url:e,sameOrigin:t,request:s,event:r});if(o)return i=o,(Array.isArray(i)&&i.length===0||o.constructor===Object&&Object.keys(o).length===0||typeof o=="boolean")&&(i=void 0),{route:c,params:i}}return{}}setDefaultHandler(e,t=v){this._defaultHandlerMap.set(t,R(e))}setCatchHandler(e){this._catchHandler=R(e)}registerRoute(e){this._routes.has(e.method)||this._routes.set(e.method,[]),this._routes.get(e.method).push(e)}unregisterRoute(e){if(!this._routes.has(e.method))throw new l("unregister-route-but-not-found-with-method",{method:e.method});const t=this._routes.get(e.method).indexOf(e);if(t>-1)this._routes.get(e.method).splice(t,1);else throw new l("unregister-route-route-not-registered")}}let y;const z=()=>(y||(y=new Q,y.addFetchListener(),y.addCacheListener()),y);function J(a,e,t){let s;if(typeof a=="string"){const n=new URL(a,location.href),c=({url:i})=>i.href===n.href;s=new w(c,e,t)}else if(a instanceof RegExp)s=new G(a,e,t);else if(typeof a=="function")s=new w(a,e,t);else if(a instanceof w)s=a;else throw new l("unsupported-route-type",{moduleName:"workbox-routing",funcName:"registerRoute",paramName:"capture"});return z().registerRoute(s),s}function X(a,e=[]){for(const t of[...a.searchParams.keys()])e.some(s=>s.test(t))&&a.searchParams.delete(t);return a}function*Y(a,{ignoreURLParametersMatching:e=[/^utm_/,/^fbclid$/],directoryIndex:t="index.html",cleanURLs:s=!0,urlManipulation:r}={}){const n=new URL(a,location.href);n.hash="",yield n.href;const c=X(n,e);if(yield c.href,t&&c.pathname.endsWith("/")){const i=new URL(c.href);i.pathname+=t,yield i.href}if(s){const i=new URL(c.href);i.pathname+=".html",yield i.href}if(r){const i=r({url:n});for(const o of i)yield o.href}}class Z extends w{constructor(e,t){const s=({request:r})=>{const n=e.getURLsToCacheKeys();for(const c of Y(r.url,t)){const i=n.get(c);if(i){const o=e.getIntegrityForCacheKey(i);return{cacheKey:i,integrity:o}}}};super(s,e.strategy)}}function ee(a){const e=K(),t=new Z(e,a);J(t)}function te(a){K().precache(a)}function se(a,e){te(a),ee(e)}se([{"revision":null,"url":"assets/index-BfGw6XTi.js"},{"revision":null,"url":"assets/index-DfOEHi4f.css"},{"revision":"d64a7902dc6758f7836b00fdc377802d","url":"index.html"},{"revision":"98dc2c731c2578448198ac6c9a687ff9","url":"registerSW.js"},{"revision":"fd1a18baa67376ae5d38ac24520e1c68","url":"manifest.webmanifest"}]);self.addEventListener("install",a=>{console.log("Service Worker installing..."),a.waitUntil(caches.open("app-cache").then(e=>e.addAll(["/","/index.html"])))});self.addEventListener("activate",a=>{console.log("Service Worker activated.")});self.addEventListener("fetch",a=>{a.respondWith(caches.match(a.request).then(e=>e||fetch(a.request)))});
