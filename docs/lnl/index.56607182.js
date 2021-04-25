function t(t){return t&&t.__esModule?t.default:t}function r(t){return t&&t.__esModule?t.default:t}var a={};const o=Math.pow(2,-52),n=new Uint32Array(512);class i{static from(t,e=f,r=h){const a=t.length,o=new Float64Array(2*a);for(let n=0;n<a;n++){const a=t[n];o[2*n]=e(a),o[2*n+1]=r(a)}return new i(o)}constructor(t){const e=t.length>>1;if(e>0&&"number"!=typeof t[0])throw new Error("Expected coords to contain numbers.");this.coords=t;const r=Math.max(2*e-5,0);this._triangles=new Uint32Array(3*r),this._halfedges=new Int32Array(3*r),this._hashSize=Math.ceil(Math.sqrt(e)),this._hullPrev=new Uint32Array(e),this._hullNext=new Uint32Array(e),this._hullTri=new Uint32Array(e),this._hullHash=new Int32Array(this._hashSize).fill(-1),this._ids=new Uint32Array(e),this._dists=new Float64Array(e),this.update()}update(){const{coords:t,_hullPrev:e,_hullNext:r,_hullTri:a,_hullHash:n}=this,i=t.length>>1;let l=1/0,c=1/0,p=-1/0,f=-1/0;for(let e=0;e<i;e++){const r=t[2*e],a=t[2*e+1];r<l&&(l=r),a<c&&(c=a),r>p&&(p=r),a>f&&(f=a),this._ids[e]=e}const h=(l+p)/2,y=(c+f)/2;let w,M,g,N=1/0;for(let e=0;e<i;e++){const r=s(h,y,t[2*e],t[2*e+1]);r<N&&(w=e,N=r)}const T=t[2*w],E=t[2*w+1];N=1/0;for(let e=0;e<i;e++){if(e===w)continue;const r=s(T,E,t[2*e],t[2*e+1]);r<N&&r>0&&(M=e,N=r)}let _=t[2*M],V=t[2*M+1],v=1/0;for(let e=0;e<i;e++){if(e===w||e===M)continue;const r=m(T,E,_,V,t[2*e],t[2*e+1]);r<v&&(g=e,v=r)}let b=t[2*g],B=t[2*g+1];if(v===1/0){for(let e=0;e<i;e++)this._dists[e]=t[2*e]-t[0]||t[2*e+1]-t[1];d(this._ids,this._dists,0,i-1);const e=new Uint32Array(i);let r=0;for(let t=0,a=-1/0;t<i;t++){const o=this._ids[t];this._dists[o]>a&&(e[r++]=o,a=this._dists[o])}return this.hull=e.subarray(0,r),this.triangles=new Uint32Array(0),void(this.halfedges=new Uint32Array(0))}if(u(T,E,_,V,b,B)){const t=M,e=_,r=V;M=g,_=b,V=B,g=t,b=e,B=r}const x=function(t,e,r,a,o,n){const i=r-t,s=a-e,l=o-t,u=n-e,c=i*i+s*s,m=l*l+u*u,d=.5/(i*u-s*l);return{x:t+(u*c-s*m)*d,y:e+(i*m-l*c)*d}}(T,E,_,V,b,B);this._cx=x.x,this._cy=x.y;for(let e=0;e<i;e++)this._dists[e]=s(t[2*e],t[2*e+1],x.x,x.y);d(this._ids,this._dists,0,i-1),this._hullStart=w;let A=3;r[w]=e[g]=M,r[M]=e[w]=g,r[g]=e[M]=w,a[w]=0,a[M]=1,a[g]=2,n.fill(-1),n[this._hashKey(T,E)]=w,n[this._hashKey(_,V)]=M,n[this._hashKey(b,B)]=g,this.trianglesLen=0,this._addTriangle(w,M,g,-1,-1,-1);for(let i,s,l=0;l<this._ids.length;l++){const c=this._ids[l],m=t[2*c],d=t[2*c+1];if(l>0&&Math.abs(m-i)<=o&&Math.abs(d-s)<=o)continue;if(i=m,s=d,c===w||c===M||c===g)continue;let p=0;for(let t=0,e=this._hashKey(m,d);t<this._hashSize&&(p=n[(e+t)%this._hashSize],-1===p||p===r[p]);t++);p=e[p];let f,h=p;for(;f=r[h],!u(m,d,t[2*h],t[2*h+1],t[2*f],t[2*f+1]);)if(h=f,h===p){h=-1;break}if(-1===h)continue;let y=this._addTriangle(h,c,r[h],-1,-1,a[h]);a[c]=this._legalize(y+2),a[h]=y,A++;let N=r[h];for(;f=r[N],u(m,d,t[2*N],t[2*N+1],t[2*f],t[2*f+1]);)y=this._addTriangle(N,c,f,a[c],-1,a[N]),a[c]=this._legalize(y+2),r[N]=N,A--,N=f;if(h===p)for(;f=e[h],u(m,d,t[2*f],t[2*f+1],t[2*h],t[2*h+1]);)y=this._addTriangle(f,c,h,-1,a[h],a[f]),this._legalize(y+2),a[f]=y,r[h]=h,A--,h=f;this._hullStart=e[c]=h,r[h]=e[N]=c,r[c]=N,n[this._hashKey(m,d)]=c,n[this._hashKey(t[2*h],t[2*h+1])]=h}this.hull=new Uint32Array(A);for(let t=0,e=this._hullStart;t<A;t++)this.hull[t]=e,e=r[e];this.triangles=this._triangles.subarray(0,this.trianglesLen),this.halfedges=this._halfedges.subarray(0,this.trianglesLen)}_hashKey(t,e){return Math.floor(function(t,e){const r=t/(Math.abs(t)+Math.abs(e));return(e>0?3-r:1+r)/4}(t-this._cx,e-this._cy)*this._hashSize)%this._hashSize}_legalize(t){const{_triangles:e,_halfedges:r,coords:a}=this;let o=0,i=0;for(;;){const s=r[t],l=t-t%3;if(i=l+(t+2)%3,-1===s){if(0===o)break;t=n[--o];continue}const u=s-s%3,m=l+(t+1)%3,d=u+(s+2)%3,p=e[i],f=e[t],h=e[m],y=e[d];if(c(a[2*p],a[2*p+1],a[2*f],a[2*f+1],a[2*h],a[2*h+1],a[2*y],a[2*y+1])){e[t]=y,e[s]=p;const a=r[d];if(-1===a){let e=this._hullStart;do{if(this._hullTri[e]===d){this._hullTri[e]=t;break}e=this._hullPrev[e]}while(e!==this._hullStart)}this._link(t,a),this._link(s,r[i]),this._link(i,d);const l=u+(s+1)%3;o<n.length&&(n[o++]=l)}else{if(0===o)break;t=n[--o]}}return i}_link(t,e){this._halfedges[t]=e,-1!==e&&(this._halfedges[e]=t)}_addTriangle(t,e,r,a,o,n){const i=this.trianglesLen;return this._triangles[i]=t,this._triangles[i+1]=e,this._triangles[i+2]=r,this._link(i,a),this._link(i+1,o),this._link(i+2,n),this.trianglesLen+=3,i}}function s(t,e,r,a){const o=t-r,n=e-a;return o*o+n*n}function l(t,e,r,a,o,n){const i=(a-e)*(o-t),s=(r-t)*(n-e);return Math.abs(i-s)>=33306690738754716e-32*Math.abs(i+s)?i-s:0}function u(t,e,r,a,o,n){return(l(o,n,t,e,r,a)||l(t,e,r,a,o,n)||l(r,a,o,n,t,e))<0}function c(t,e,r,a,o,n,i,s){const l=t-i,u=e-s,c=r-i,m=a-s,d=o-i,p=n-s,f=c*c+m*m,h=d*d+p*p;return l*(m*h-f*p)-u*(c*h-f*d)+(l*l+u*u)*(c*p-m*d)<0}function m(t,e,r,a,o,n){const i=r-t,s=a-e,l=o-t,u=n-e,c=i*i+s*s,m=l*l+u*u,d=.5/(i*u-s*l),p=(u*c-s*m)*d,f=(i*m-l*c)*d;return p*p+f*f}function d(t,e,r,a){if(a-r<=20)for(let o=r+1;o<=a;o++){const a=t[o],n=e[a];let i=o-1;for(;i>=r&&e[t[i]]>n;)t[i+1]=t[i--];t[i+1]=a}else{let o=r+1,n=a;p(t,r+a>>1,o),e[t[r]]>e[t[a]]&&p(t,r,a),e[t[o]]>e[t[a]]&&p(t,o,a),e[t[r]]>e[t[o]]&&p(t,r,o);const i=t[o],s=e[i];for(;;){do{o++}while(e[t[o]]<s);do{n--}while(e[t[n]]>s);if(n<o)break;p(t,o,n)}t[r+1]=t[n],t[n]=i,a-o+1>=n-r?(d(t,e,o,a),d(t,e,r,n-1)):(d(t,e,r,n-1),d(t,e,o,a))}}function p(t,e,r){const a=t[e];t[e]=t[r],t[r]=a}function f(t){return t[0]}function h(t){return t[1]}var y;!function(t,e,r){Object.defineProperty(t,e,{get:r,enumerable:!0})}(a,"default",(function(){return i})),y=a,Object.defineProperty(y,"__esModule",{value:!0});var w=r(a);const M=t=>t.reduce(((t,e)=>t.concat(e)),[]),g=t=>({data:new Float32Array(M(t)),length:t.length,stride:void 0===t[0]?0:t[0].length}),N=t=>"folder"===t.type||"sprite"===t.type,T=(t,e,r=[])=>{for(const a of t){e(a,r);for(const t of a.mutationVectors)e(t,[...r,a]);"folder"===a.type&&T(a.items,e,[...r,a])}},E={translate:1,stretch:2,rotate:3,deform:4,opacity:5},_=(t,e)=>{const r=t[t.length-1];if(N(r)){const a=e?r.mutationVectors.indexOf(e):-1;if(a>0)return r.mutationVectors[a-1];for(let r=t.length-(e?2:1);r>=0;r--){const e=t[r];if(e&&N(e)&&e.mutationVectors.length>0)return e.mutationVectors[e.mutationVectors.length-1]}}return null},V=t=>{const e=t.controls.map((t=>t.name));return t.animations.map((t=>{const r=[],a=[];return t.keyframes.reduce(((t,e)=>(e.event&&a.push([e.time,e.event]),t.concat(Object.keys(e.controlValues)))),[]).filter(((t,e,r)=>r.indexOf(t)===e)).forEach((a=>{const o=[];t.keyframes.forEach((t=>{const e=t.controlValues[a];void 0!==e&&o.push([t.time,e])})),r.push([e.indexOf(a),new Float32Array(M(o))])})),{name:t.name,duration:0===t.keyframes.length?0:t.keyframes[t.keyframes.length-1].time,looping:t.looping,tracks:r,events:a}}))};var v=t=>{if("1.0"!==t.version)throw new Error("Only version 1.0 files are supported");const e=[],r=[],a=[];T(t.shapes,(t=>{if("sprite"!==t.type)return;const o=(t=>{let e=1/0,r=-1/0,a=1/0,o=-1/0;return t.points.forEach((([t,n])=>{e=t<e?t:e,r=t>r?t:r,a=n<a?n:a,o=n>o?n:o})),[(e+r)/2,(a+o)/2]})(t),n=(i=t.points,w.from(i).triangles);var i;const s=[...t.translate,.1*e.length],l=r.length;e.push({name:t.name,start:2*a.length,amount:n.length,mutator:0,x:s[0],y:s[1],z:1e-4*s[2]-.9}),t.points.forEach((([t,e])=>{r.push([t-o[0],e-o[1],t,e])})),n.forEach((t=>{a.push(t+l)}))}));const o=(t=>{const e=[],r=[],a={};T(t,((t,o)=>{if((t=>"deform"===t.type||"rotate"===t.type||"translate"===t.type||"stretch"===t.type||"opacity"===t.type)(t)){const i=[E[(n=t).type],n.origin[0],n.origin[1],"deform"===n.type||"translate"===n.type?n.radius:-1],s=r.length;r.push(i);const l=_(o,t),u=null===l?-1:e.findIndex((t=>t.name===l.name));e.push({name:t.name,index:s,parent:u}),a[t.name]=u}var n}));const o={};T(t,((t,r)=>{if(N(t)){const a=_(r.concat(t)),n=null===a?-1:e.findIndex((t=>t.name===a.name));o[t.name]=n}}));const n=new Int32Array(r.length);return e.forEach(((t,e)=>{n[e]=t.parent})),{mutatorMapping:a,parentList:n,vectorSettings:r,shapeMutatorMapping:o}})(t.shapes),n=o.parentList.length,i=Object.keys(o.mutatorMapping),s=[],l=new Float32Array(2*n);Object.entries(t.defaultFrame).forEach((([t,e])=>{const r=i.indexOf(t);-1!==r&&(l[2*r]=e[0],l[2*r+1]=e[1])}));const u=[],c=[],m=[];e.forEach((t=>{t.mutator=o.shapeMutatorMapping[t.name]})),e.sort(((t,e)=>(e.z||0)-(t.z||0)));const d=new Float32Array(t.controls.length),p=t.controls.reduce(((e,r,a)=>{const o=r.steps.reduce(((t,e)=>t.concat(Object.keys(e).filter((e=>!t.includes(e))))),[]);return s.push({name:r.name,steps:r.steps.length}),d[a]=t.controlValues[r.name],o.forEach((a=>{const o=i.indexOf(a),n=r.steps.map((t=>t[a])),s=t?.controls?.findIndex?.((t=>t.name===r.name))||0,l={name:r.name,controlIndex:s,valueStartIndex:u.length,values:n,stepType:0};u.push(...n),e={...e,[o]:{controls:((e[o]||{}).controls||[]).concat(l)}}})),e}),{}),f=Math.max(...Object.keys(p).map((t=>parseInt(t,10))));m.length=f,m.fill([0,0]);let h=0;return Object.entries(p).forEach((([t,e])=>{const r=e.controls.map((t=>[t.valueStartIndex,t.controlIndex,t.stepType]));m[parseInt(t,10)]=[c.length,r.length],h=Math.max(h,r.length),c.push(...r)})),{mutators:g(o.vectorSettings),mutatorParents:{data:o.parentList,length:o.parentList.length,stride:1},mutationValues:{data:l,length:o.parentList.length,stride:2},controlMutationValues:g(u),mutationValueIndices:g(c),controlMutationIndices:g(m),defaultControlValues:d,shapeVertices:g(r),shapeIndices:new Uint16Array(a),shapes:e,controls:s,maxIteration:h,animations:V(t)}},b=r("precision mediump float;\n#define GLSLIFY 1\nvarying mediump vec2 vTextureCoord;varying mediump float vOpacity;uniform sampler2D uSampler;uniform mediump vec2 uTextureDimensions;void main(void){highp vec2 A=vTextureCoord.xy/uTextureDimensions;mediump vec4 B=texture2D(uSampler,A);gl_FragColor=vec4(B.rgb*B.a*vOpacity,B.a*vOpacity);}"),B=r("#define GLSLIFY 1\n#define A 0.017453292519943295\nuniform vec2 viewport;uniform vec3 basePosition;uniform vec3 translate;uniform float mutation;uniform vec4 scale;uniform vec2 uMutationValues[MAX_MUT];uniform vec4 uMutationVectors[MAX_MUT];uniform int uMutationParent[MAX_MUT];attribute vec2 coordinates;attribute vec2 aTextureCoord;varying lowp vec2 vTextureCoord;varying lowp float vOpacity;mat4 B=mat4(2./viewport.x,0,0,0,0,-2./viewport.y,0,0,0,0,1,0,-1,+1,0,1);vec2 C(int D,int E){vec2 F=uMutationValues[D];vec2 G=uControlMutationIndices[D];int H=int(G.x);int I=int(G.y);if(I==0){return F;}for(int J=0;J<MAX_IT;J++){if(J<I){vec3 K=uMutationValueIndices[H+J];float L=uControlValues[int(K.y)];int M=int(floor(K.x+L));int N=int(ceil(K.x+L));float O=L-floor(L);vec2 P=uControlMutationValues[M];vec2 Q=uControlMutationValues[N];vec2 R=mix(P,Q,O);if(E==2||E==5){F*=R;}else{F+=R;}}else{return F;}}return F;}vec3 S(vec3 T,int D){vec4 mutation=uMutationVectors[D];int E=int(mutation.x);vec2 U=C(D,E);vec2 V=mutation.yz;vec3 F=T;if(E==1){float W=1.;if(mutation.a>0.&&distance(T.xy,V)>mutation.a){W=0.;}F=vec3(T.xy+U*W,T.z);}if(E==2){F=vec3(V.xy+vec2((T.x-V.x)*U.x,(T.y-V.y)*U.y),T.z);}if(E==3){float X=U.x*A;mat2 Y=mat2(cos(X),sin(X),-sin(X),cos(X));F=vec3((T.xy-V)*Y+V,T.z);}if(E==4){float W=1.-clamp(distance(T.xy,V),0.,mutation.a)/mutation.a;F=vec3(T.xy+U*W,T.z);}if(E==5){float Z=U.x;F=vec3(T.xy,T.z*Z);}return F;}vec3 a(vec3 T,int D){int b=D;vec3 F=T;for(int J=0;J<MAX_MUT;J++){if(b==-1){return F;}F=S(F,b);b=uMutationParent[b];}return F;}void main(){vec3 c=a(vec3(coordinates+translate.xy,1.),int(mutation));vec4 d=B*vec4((c.xy+basePosition.xy)*scale.x,translate.z-basePosition.z,1.);gl_Position=vec4((d.xy+scale.ba)*scale.y,d.z,1.);vTextureCoord=aTextureCoord.xy;vOpacity=c.z;}");const x=(t,e,r=0)=>{for(let a=0;a<t.length;a+=2)if(t[a]>e){const o=a>1?t[a-2]:0,n=a>1?t[a-1]:r,i=(e-o)/(t[a]-o);return n*(1-i)+t[a+1]*i}return t[t.length-1]},A={zoom:1,panX:0,panY:0,zIndex:0},k=t=>{const e=t.getContext("webgl",{premultipliedalpha:!0,depth:!0,antialias:!0,powerPreference:"low-power"});if(!e)throw new Error("Canvas has no webgl context available");return e};const R=t=>{const e=k(t),r=[];let a=[],o=[];return{render:()=>{e.clear(e.COLOR_BUFFER_BIT|e.DEPTH_BUFFER_BIT),e.viewport(0,0,t.width,t.height)},addAnimation:(n,i,s,l)=>{const u=[e.TEXTURE0,e.TEXTURE1,e.TEXTURE2,e.TEXTURE3,e.TEXTURE4,e.TEXTURE5,e.TEXTURE6,e.TEXTURE7,e.TEXTURE8,e.TEXTURE9][s],[c,m,d]=((t,e)=>{const r=t.createProgram();if(!r)throw new Error("Failed to create shader program");const a=(t=>`\n  #define MAX_MUT ${t.mutators.length}\n  #define MAX_IT ${t.maxIteration}\n  uniform vec2 uControlMutationValues[${t.controlMutationValues.length}];\n  uniform vec3 uMutationValueIndices[${t.mutationValueIndices.length}];\n  uniform vec2 uControlMutationIndices[${t.controlMutationIndices.length}];\n  uniform float uControlValues[${t.controls.length}];\n  ${B}\n`)(e),o=t.createShader(t.VERTEX_SHADER),n=t.createShader(t.FRAGMENT_SHADER);if(!o||!n)throw t.deleteProgram(r),t.deleteShader(o),t.deleteShader(n),new Error("Failed to create shader program");if(t.shaderSource(o,a),t.shaderSource(n,b),t.compileShader(o),t.compileShader(n),t.attachShader(r,o),t.attachShader(r,n),t.linkProgram(r),!t.getProgramParameter(r,t.LINK_STATUS))throw console.error("Link failed: "+t.getProgramInfoLog(r)),console.error("vs info-log: "+t.getShaderInfoLog(o)),console.error("fs info-log: "+t.getShaderInfoLog(n)),new Error("Could not initialise shaders");return[r,o,n]})(e,n);e.useProgram(c);const p=((t,e,r)=>{const a=t.createTexture();return t.bindTexture(t.TEXTURE_2D,a),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,r),t.useProgram(e),t.uniform2f(t.getUniformLocation(e,"uTextureDimensions"),r.width,r.height),a})(e,c,i),f=e.getUniformLocation(c,"uMutationParent");e.uniform1iv(f,n.mutatorParents.data);const h=((t,e)=>(r,a)=>{const o=t.getUniformLocation(e,r),n=a.stride;2==n?t.uniform2fv(o,a.data):3==n?t.uniform3fv(o,a.data):4==n&&t.uniform4fv(o,a.data)})(e,c);h("uMutationVectors",n.mutators),h("uMutationValues",n.mutationValues),h("uControlMutationValues",n.controlMutationValues),h("uMutationValueIndices",n.mutationValueIndices),h("uControlMutationIndices",n.controlMutationIndices);const y=e.getUniformLocation(c,"uControlValues");e.uniform1fv(y,n.defaultControlValues);const w=new Float32Array(n.defaultControlValues),M=new Float32Array(n.defaultControlValues),g=e.createBuffer(),N=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,g),e.bufferData(e.ARRAY_BUFFER,n.shapeVertices.data,e.STATIC_DRAW),e.bindBuffer(e.ARRAY_BUFFER,null),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,N),e.bufferData(e.ELEMENT_ARRAY_BUFFER,n.shapeIndices,e.STATIC_DRAW),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);const T=e.getUniformLocation(c,"basePosition"),E=e.getUniformLocation(c,"translate"),_=e.getUniformLocation(c,"mutation"),V=e.getUniformLocation(c,"viewport"),v=e.getUniformLocation(c,"scale"),k=e.getAttribLocation(c,"coordinates"),R=e.getAttribLocation(c,"aTextureCoord");let C=0,S=0,{zoom:L,panX:U,panY:F,zIndex:I}={...A,...l},P=[0,0],X=1;const D=[],W=n.animations.map((t=>t.name)),O=n.controls.map((t=>t.name)),z=n.animations.map((t=>t.looping)),$=t=>{const e=D.findIndex((e=>e.name===t));if(-1===e)return;const r=D[e];let o=+new Date-r.startedAt+r.startAt;const i=n.animations[r.index];z[r.index]&&(o%=i.duration),D.splice(e,1);for(const[t,e]of i.tracks){const r=x(e,o,w[t]);w[t]=r}for(const e of a)e(t)},Y=t=>{const e=O.indexOf(t);if(-1===e)throw new Error(`Control ${t} does not exist in ${O.join(",")}`);return e},G=t=>{const e=W.indexOf(t);if(-1===e)throw new Error(`Track ${t} does not exist in ${W.join(",")}`);return e},j={destroy:function(){e.deleteShader(m),e.deleteShader(d),e.deleteProgram(c),e.deleteTexture(p),e.deleteBuffer(g),e.deleteBuffer(N),r.splice(r.indexOf(j),1)},setLooping:function(t,e){const r=G(e);z[r]=t},startTrack:function(t,{startAt:e=0,speed:r=1}={}){const a=G(t),o=n.animations[a].tracks.map((([t])=>t));for(const t of D)n.animations[t.index].tracks.some((([t])=>o.includes(t)))&&$(W[t.index]);D.push({name:t,index:a,startAt:e,speed:r,startedAt:+new Date,iterationStartedAt:+new Date-e/r,lastRender:0})},stopTrack:$,setControlValue:(t,e)=>{const r=Y(t),a=n.controls[r].steps-1;if(e<0||e>a)throw new Error(`Control ${t} value shoulde be between 0 and ${a}. ${e} is out of bounds.`);for(const t of D)n.animations[t.index].tracks.some((([t])=>t===r))&&$(W[t.index]);w[r]=e,M[r]=e},getControlValue:t=>w[Y(t)],setPanning:function(t,e){U=t,F=e},setZoom:function(t){L=t},setZIndex:function(t){I=t},render:function(){if(e.useProgram(c),e.bindBuffer(e.ARRAY_BUFFER,g),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,N),e.vertexAttribPointer(k,2,e.FLOAT,!1,4*Float32Array.BYTES_PER_ELEMENT,0),e.enableVertexAttribArray(k),e.vertexAttribPointer(R,2,e.FLOAT,!1,4*Float32Array.BYTES_PER_ELEMENT,2*Float32Array.BYTES_PER_ELEMENT),e.enableVertexAttribArray(R),t.width!==C||t.height!==S){const r=t.width,a=t.height,o=i.width/r>i.height/a;X=o?r/i.width:a/i.height,e.uniform2f(V,r,a),P=[r/2/X,a/2/X],C=t.width,S=t.height}e.uniform4f(v,X,L,U,F),e.activeTexture(u),e.bindTexture(e.TEXTURE_2D,p),e.uniform1i(e.getUniformLocation(c,"uSampler"),s),e.uniform3f(T,P[0],P[1],.01*I);const r=+new Date;for(const t of D){const e=(r-t.iterationStartedAt)*t.speed,a=n.animations[t.index],i=e%a.duration;if(a.duration<e){if(!z[t.index]){$(a.name);continue}t.iterationStartedAt=r-i;for(const[t]of a.tracks)w[t]=M[t]}for(const[e,n]of a.events){const a=t.iterationStartedAt+e;if(a<r&&a>t.lastRender)for(const r of o)r(n,t.name,e)}t.lastRender=r;for(const[t,e]of a.tracks){const r=x(e,i,w[t]);M[t]=r}}e.uniform1fv(y,M);for(const t of n.shapes)e.uniform3f(E,t.x,t.y,t.z),e.uniform1f(_,t.mutator),e.drawElements(e.TRIANGLES,t.amount,e.UNSIGNED_SHORT,t.start)},onTrackStopped:function(t){return a=a.concat(t),()=>{a=a.filter((e=>e!==t))}},onEvent:function(t){return o=o.concat(t),()=>{o=o.filter((e=>e!==t))}}};return r.push(j),j},destroy:function(){for(const t of r)t.destroy();r.length=0}}};var C=null;var S,L=t(function(){return C||(C=function(){try{throw new Error}catch(e){var t=(""+e.stack).match(/(https?|file|ftp):\/\/[^)\n]+/g);if(t)return(""+t[0]).replace(/^((?:https?|file|ftp):\/\/.+)\/[^/]+$/,"$1")+"/"}return"/"}()),C}()+"scenery.0d61ca17.png"),U=t(JSON.parse('{"animations":[{"name":"Wheel","looping":true,"keyframes":[{"time":0,"controlValues":{"WheelRotate":1}},{"time":19200,"controlValues":{"WheelRotate":0}}]},{"name":"Tree","looping":true,"keyframes":[{"time":0,"controlValues":{"TreeLeaves1":0}},{"time":500,"controlValues":{"TreeLeaves2":0}},{"time":8000,"controlValues":{"TreeLeaves1":1}},{"time":8500,"controlValues":{"TreeLeaves2":1}},{"time":16000,"controlValues":{"TreeLeaves1":0,"TreeLeaves2":0.04}}]},{"name":"Bird","looping":true,"keyframes":[{"time":6000,"controlValues":{"Beak":0}},{"time":6200,"controlValues":{"Beak":1}},{"time":7000,"controlValues":{"Beak":1}},{"time":7200,"controlValues":{"Beak":0}}]},{"name":"Cloud1","looping":true,"keyframes":[{"time":0,"controlValues":{"Cloud1":0.5}},{"time":20000,"controlValues":{"Cloud1":1}},{"time":20001,"controlValues":{"Cloud1":0}},{"time":40000,"controlValues":{"Cloud1":0.5}}]},{"name":"Eyes","looping":true,"keyframes":[{"time":0,"controlValues":{"EyesBlink":1}},{"time":3000,"controlValues":{"EyesBlink":1}},{"time":3300,"controlValues":{"EyesBlink":0}},{"time":3500,"controlValues":{"EyesBlink":0}},{"time":3700,"controlValues":{"EyesBlink":1}}]},{"name":"ButterflyWings","looping":true,"keyframes":[{"time":300,"controlValues":{"ButterflyWings":1}},{"time":600,"controlValues":{"ButterflyWings":0}}]},{"name":"Smoke","looping":true,"keyframes":[{"time":0,"controlValues":{"Rook":0,"Smoke":0}},{"time":10000,"controlValues":{"Rook":1,"Smoke":1}}]},{"name":"Cloud2","looping":true,"keyframes":[{"time":0,"controlValues":{"Cloud2":0.8}},{"time":30000,"controlValues":{"Cloud2":0}},{"time":30001,"controlValues":{"Cloud2":1}},{"time":40000,"controlValues":{"Cloud2":0.8}}]},{"name":"Cloud3","looping":true,"keyframes":[{"time":0,"controlValues":{"Cloud3":0.2}},{"time":10000,"controlValues":{"Cloud3":0}},{"time":10001,"controlValues":{"Cloud3":1}},{"time":40000,"controlValues":{"Cloud3":0.2}}]},{"name":"WheelBlades","looping":true,"keyframes":[{"time":0,"controlValues":{"WheelBlades":0}},{"time":1600,"controlValues":{"WheelBlades":1}}]},{"name":"Water","looping":true,"keyframes":[{"time":0,"controlValues":{"Bubble":1.6,"Bubble2":0.9,"Bubble3":0.3}},{"time":400,"controlValues":{"Bubble":2}},{"time":401,"controlValues":{"Bubble":0}},{"time":1600,"controlValues":{"Bubble2":1.6,"Bubble3":0.9,"Bubble":0.3}},{"time":2000,"controlValues":{"Bubble2":2}},{"time":2001,"controlValues":{"Bubble2":0}},{"time":3200,"controlValues":{"Bubble3":1.6,"Bubble":0.9,"Bubble2":0.3}},{"time":3600,"controlValues":{"Bubble3":2}},{"time":3601,"controlValues":{"Bubble3":0}},{"time":4800,"controlValues":{"Bubble2":0.9,"Bubble3":0.3,"Bubble":1.6}}]}],"controlValues":{"WheelRotate":0.97,"TreeLeaves1":0,"TreeLeaves2":0.16,"Beak":0,"Cloud1":0.5,"EyesBlink":1,"ButterflyWings":0,"Rook":1,"Cloud2":0.8,"Cloud3":1,"New Control":1,"Butterflyturn":1,"ButterflyZoom":1,"ButterflyX":0.49,"ButterflyY":0.29,"ButterflyTurn":0,"WheelBlades":0.39,"Smoke":0,"Buble":1.46,"Bubble":0.3,"Bubble2":0.9,"Bubble3":1.6},"controls":[{"name":"Bubble3","type":"slider","steps":[{"New Mutator (40)":[-11,0]},{"New Mutator (40)":[-77,49]},{"New Mutator (40)":[-126,107]}]},{"name":"Bubble2","type":"slider","steps":[{"New Mutator (39)":[-9,2]},{"New Mutator (39)":[-75,51]},{"New Mutator (39)":[-130,110]}]},{"name":"Bubble","type":"slider","steps":[{"New Mutator (38)":[-19,0]},{"New Mutator (38)":[-85,43]},{"New Mutator (38)":[-149,115]}]},{"name":"WheelBlades","type":"slider","steps":[{"New Mutator (24)":[0,0],"New Mutator (25)":[1,0.8],"New Mutator (26)":[0,0],"New Mutator (27)":[1,0],"New Mutator (28)":[0,0],"New Mutator (29)":[1,1],"New Mutator (30)":[0,0],"New Mutator (31)":[0.65,1],"New Mutator (32)":[11,0],"New Mutator (35)":[33,0],"New Mutator (34)":[1,0.03],"New Mutator (33)":[0,0],"New Mutator (37)":[43,0]},{"New Mutator (24)":[-33,-19],"New Mutator (25)":[1,0.7],"New Mutator (26)":[10,0],"New Mutator (27)":[-31,-65],"New Mutator (28)":[13,0],"New Mutator (29)":[1,0.75],"New Mutator (30)":[-10,-83],"New Mutator (31)":[0.66,0.05],"New Mutator (32)":[0,0],"New Mutator (35)":[17,0],"New Mutator (34)":[1,-0.37],"New Mutator (33)":[9,-88],"New Mutator (37)":[-2,0]}]},{"name":"Smoke","type":"slider","steps":[{"New Mutator (16)":[0,0]},{"New Mutator (16)":[0,-128]}]},{"name":"ButterflyY","type":"slider","steps":[{"New Mutator (22)":[0,-216]},{"New Mutator (22)":[0,210]}]},{"name":"ButterflyX","type":"slider","steps":[{"New Mutator (22)":[-400,0]},{"New Mutator (22)":[200,0]}]},{"name":"ButterflyZoom","type":"slider","steps":[{"New Mutator (21)":[1,1]},{"New Mutator (21)":[0.5,0.5]}]},{"name":"ButterflyTurn","type":"slider","steps":[{"New Mutator (21)":[1,1]},{"New Mutator (21)":[-1,1]}]},{"name":"ButterflyWings","type":"slider","steps":[{"New Mutator (13)":[1,1],"New Mutator (14)":[1,1]},{"New Mutator (13)":[1,-1.05],"New Mutator (14)":[1,-0.4]}]},{"name":"EyesBlink","type":"slider","steps":[{"New Mutator (12)":[1,1]},{"New Mutator (12)":[0,0]}]},{"name":"Cloud1","type":"slider","steps":[{"New Mutator (11)":[1200,0]},{"New Mutator (11)":[-1300,0]}]},{"name":"Cloud2","type":"slider","steps":[{"New Mutator (19)":[-2101,0]},{"New Mutator (19)":[270,0]}]},{"name":"Cloud3","type":"slider","steps":[{"New Mutator (20)":[-546,0]},{"New Mutator (20)":[1753,0]}]},{"name":"Beak","type":"slider","steps":[{"New Mutator (7)":[0,0],"New Mutator (6)":[0,0]},{"New Mutator (7)":[-19,0],"New Mutator (6)":[7,0]}]},{"name":"TreeLeaves2","type":"slider","steps":[{"New Mutator (5)":[-42,0],"New Mutator (9)":[-11,0],"New Mutator (23)":[-12,0],"New Mutator (36)":[0,0]},{"New Mutator (5)":[48,0],"New Mutator (9)":[8,0],"New Mutator (23)":[13,0],"New Mutator (36)":[0,13]}]},{"name":"TreeLeaves1","type":"slider","steps":[{"New Mutator (4)":[-27,0],"New Mutator (8)":[-13,0],"New Mutator (10)":[-6,0]},{"New Mutator (4)":[40,0],"New Mutator (8)":[12,0],"New Mutator (10)":[11,0]}]},{"name":"WheelRotate","type":"slider","steps":[{"New Mutator (3)":[0,0],"New Mutator (2)":[0,0]},{"New Mutator (3)":[360,0],"New Mutator (2)":[360,0]}]}],"defaultFrame":{"New Mutator":[0.45,1],"New Mutator (1)":[0.45,1],"New Mutator (2)":[0,0],"New Mutator (3)":[90,0],"New Mutator (4)":[0,0],"New Mutator (5)":[0,0],"New Mutator (6)":[0,0],"New Mutator (7)":[0,0],"New Mutator (8)":[0,0],"New Mutator (9)":[0,0],"New Mutator (10)":[0,0],"New Mutator (12)":[1,0],"New Mutator (13)":[1,1],"New Mutator (14)":[1,0.85],"New Mutator (15)":[-41,0],"New Mutator (17)":[37,0],"New Mutator (18)":[23,0],"New Mutator (21)":[1,1],"New Mutator (23)":[0,0],"New Mutator (25)":[1,1],"New Mutator (26)":[0,0],"New Mutator (29)":[1,0.7],"New Mutator (28)":[10,0],"New Mutator (31)":[1,0.53],"New Mutator (30)":[-8,3],"New Mutator (32)":[24,0],"New Mutator (34)":[1,1],"New Mutator (33)":[30,-25],"New Mutator (35)":[0,0],"New Mutator (36)":[0,-9]},"shapes":[{"type":"sprite","points":[[277,1220],[295,1149],[308,1110],[345,1126],[350,1160],[345,1201],[331,1226],[387,1236],[379,1191],[379,1138],[398,1097],[423,1071],[449,1103],[457,1134],[457,1167],[463,1211],[454,1240],[502,1244],[493,1212],[490,1173],[495,1127],[502,1087],[528,1079],[566,1097],[571,1139],[587,1175],[582,1211],[562,1240],[622,1177],[621,1146],[621,1111],[643,1079],[672,1109],[680,1147],[651,1178],[678,1195],[693,1138],[706,1124],[706,1088],[724,1090],[737,1112],[744,1135],[747,1169],[728,1198]],"translate":[429,-310],"mutationVectors":[{"type":"deform","origin":[289,-335],"name":"New Mutator (8)","radius":73},{"type":"deform","origin":[453,-353],"name":"New Mutator (9)","radius":83},{"type":"deform","origin":[600,-355],"name":"New Mutator (10)","radius":66}],"name":"BackTrees"},{"name":"Bird","type":"folder","items":[{"type":"sprite","points":[[1119,1056],[1120,1068],[1171,1065],[1168,1055]],"translate":[112,-386],"mutationVectors":[{"type":"rotate","origin":[88,-386],"name":"New Mutator (6)"}],"name":"Top"},{"type":"sprite","points":[[1120,1091],[1120,1101],[1151,1101],[1152,1092]],"translate":[104,-384],"mutationVectors":[{"type":"rotate","origin":[90,-384],"name":"New Mutator (7)"}],"name":"Bottom"}],"mutationVectors":[]},{"name":"Vlinder","type":"folder","items":[{"type":"sprite","points":[[63,1352],[137,1356],[143,1311],[65,1308]],"translate":[760,222],"mutationVectors":[{"type":"stretch","origin":[753,241],"name":"New Mutator (13)"}],"name":"Vleugel1"},{"type":"sprite","points":[[61,1376],[61,1358],[130,1363],[130,1379]],"translate":[747,240],"mutationVectors":[],"name":"Lijf"},{"type":"sprite","points":[[63,1352],[137,1356],[143,1311],[65,1308]],"translate":[757,222],"mutationVectors":[{"type":"stretch","origin":[752,243],"name":"New Mutator (14)"}],"name":"Vleugel2"}],"mutationVectors":[{"name":"New Mutator (22)","type":"translate","origin":[0,0],"radius":-1},{"type":"stretch","origin":[765,236],"name":"New Mutator (21)"},{"type":"rotate","origin":[754,244],"name":"New Mutator (15)"}]},{"name":"Tree","type":"folder","items":[{"type":"sprite","points":[[2012,1214],[2016,1361],[2009,1423],[2010,1476],[2002,1510],[2019,1564],[2004,1586],[2000,1626],[2009,1656],[1994,1683],[1994,1716],[1959,1716],[1953,1683],[1955,1620],[1952,1566],[1955,1504],[1957,1433],[1966,1348],[1976,1279],[1975,1240],[1975,1220],[1952,1259],[1945,1283],[1944,1319],[1939,1347],[1932,1385],[1922,1417],[1914,1453],[1901,1483],[1900,1512],[1902,1548],[1911,1582],[1902,1605],[1904,1631],[1904,1663],[1877,1672],[1862,1649],[1861,1593],[1852,1545],[1857,1495],[1863,1458],[1864,1396],[1876,1347],[1861,1353],[1853,1390],[1849,1421],[1852,1453],[1842,1482],[1842,1510],[1846,1540],[1845,1579],[1845,1607],[1849,1635],[1842,1656],[1856,1699],[1833,1715],[1813,1699],[1807,1670],[1802,1632],[1801,1591],[1801,1553],[1803,1512],[1805,1475],[1808,1435],[1808,1397],[1814,1357],[1818,1336],[1802,1330],[1786,1364],[1777,1383],[1780,1407],[1789,1440],[1786,1471],[1769,1501],[1766,1522],[1773,1552],[1782,1589],[1778,1617],[1755,1627],[1736,1611],[1721,1571],[1724,1533],[1727,1499],[1729,1465],[1729,1427],[1733,1393],[1738,1364],[1743,1323],[1752,1294],[1760,1262],[1780,1252],[1811,1261],[1829,1265],[1865,1247],[1786,1229],[1728,1232],[1749,1680]],"translate":[883,-221],"mutationVectors":[{"type":"deform","origin":[906,-79],"name":"New Mutator (5)","radius":298}],"name":"Leaves2"},{"type":"sprite","points":[[1442,1246],[1679,1233],[1654,1356],[1643,1500],[1640,1638],[1642,1721],[1632,1752],[1595,1746],[1579,1705],[1573,1638],[1568,1572],[1569,1508],[1573,1420],[1573,1383],[1564,1412],[1559,1458],[1551,1502],[1552,1545],[1550,1573],[1541,1615],[1540,1647],[1520,1664],[1502,1652],[1497,1617],[1496,1577],[1504,1536],[1504,1497],[1504,1462],[1516,1424],[1520,1388],[1506,1385],[1509,1425],[1498,1452],[1495,1473],[1492,1501],[1485,1513],[1493,1543],[1490,1576],[1469,1580],[1454,1568],[1446,1538],[1444,1500],[1454,1466],[1456,1442],[1451,1401],[1458,1363],[1463,1335],[1424,1274],[1422,1396],[1423,1483],[1427,1557],[1438,1617],[1687,1739],[1678,1603],[1675,1440]],"translate":[901,-220],"mutationVectors":[{"type":"deform","origin":[895,-93],"name":"New Mutator (4)","radius":298}],"name":"Leaves1"}],"mutationVectors":[]},{"name":"Wheel","type":"folder","items":[{"type":"sprite","points":[[947,1271],[1382,1271],[1409,1821],[962,1871]],"translate":[79,56],"mutationVectors":[],"name":"Wheelhouse"},{"name":"Water","type":"folder","items":[{"type":"sprite","points":[[782,1778],[797,1755],[857,1773],[835,1804]],"translate":[95,171],"mutationVectors":[{"name":"New Mutator (38)","type":"translate","origin":[0,0],"radius":-1}],"name":"WaterMove"},{"type":"sprite","points":[[782,1796],[755,1819],[800,1842],[823,1811]],"translate":[73,171],"mutationVectors":[{"name":"New Mutator (39)","type":"translate","origin":[0,0],"radius":-1}],"name":"WaterMove2"},{"type":"sprite","points":[[747,1839],[723,1861],[762,1883],[781,1863]],"translate":[71,172],"mutationVectors":[{"name":"New Mutator (40)","type":"translate","origin":[71,172],"radius":-1}],"name":"WaterMove3"}],"mutationVectors":[]},{"type":"sprite","points":[[1076,1892],[1187,1888],[1192,1978],[1073,1983]],"translate":[33,193],"mutationVectors":[],"name":"Hider"},{"type":"sprite","points":[[340,1312],[703,1312],[703,1675],[340,1675]],"translate":[142,5],"mutationVectors":[{"type":"stretch","origin":[141,4],"name":"New Mutator"},{"type":"rotate","origin":[141,4],"name":"New Mutator (2)"}],"name":"WheelRight"},{"type":"sprite","points":[[775,1306],[899,1303],[907,1682],[771,1678]],"translate":[102,6],"mutationVectors":[],"name":"Side"},{"name":"Blades","type":"folder","items":[{"type":"sprite","points":[[63,1216],[63,1269],[185,1216],[184,1269]],"translate":[48,56],"mutationVectors":[{"name":"New Mutator (30)","type":"translate","origin":[48,56],"radius":-1},{"type":"stretch","origin":[-12,82],"name":"New Mutator (31)"},{"name":"New Mutator (32)","type":"translate","origin":[-12,31],"radius":6}],"name":"Blade3"},{"type":"sprite","points":[[63,1216],[63,1269],[185,1216],[184,1269]],"translate":[105,142],"mutationVectors":[{"name":"New Mutator (24)","type":"translate","origin":[0,0],"radius":-1},{"type":"stretch","origin":[97,168],"name":"New Mutator (25)"},{"name":"New Mutator (26)","type":"translate","origin":[46,113],"radius":24}],"name":"Blade1"},{"type":"sprite","points":[[63,1216],[63,1269],[185,1216],[184,1269]],"translate":[71,122],"mutationVectors":[{"name":"New Mutator (27)","type":"translate","origin":[0,0],"radius":-1},{"type":"stretch","origin":[62,152],"name":"New Mutator (29)"},{"name":"New Mutator (28)","type":"translate","origin":[14,98],"radius":16}],"name":"Blade2"},{"type":"sprite","points":[[63,1216],[63,1269],[185,1216],[184,1269]],"translate":[0,0],"mutationVectors":[{"name":"New Mutator (33)","type":"translate","origin":[0,0],"radius":-1},{"type":"stretch","origin":[-60,27],"name":"New Mutator (34)"},{"name":"New Mutator (35)","type":"translate","origin":[-61,-27],"radius":8}],"name":"Blade4"},{"type":"sprite","points":[[63,1216],[63,1269],[185,1216],[184,1269]],"translate":[107,149],"mutationVectors":[{"name":"New Mutator (37)","type":"translate","origin":[0,0],"radius":-1}],"name":"Blade5"}],"mutationVectors":[]},{"type":"sprite","points":[[340,1312],[703,1312],[703,1675],[340,1675]],"translate":[48,0],"mutationVectors":[{"type":"stretch","origin":[48,0],"name":"New Mutator (1)"},{"type":"rotate","origin":[48,0],"name":"New Mutator (3)"}],"name":"WheelLeft"}],"mutationVectors":[]},{"type":"sprite","points":[[814,123],[869,119],[930,128],[934,133],[936,264],[810,268]],"translate":[-151,-319],"mutationVectors":[],"name":"Schoorsteen"},{"type":"sprite","points":[[96,1696],[96,1440],[236,1440],[236,1696],[96,1664],[96,1472],[96,1504],[96,1536],[96,1568],[96,1600],[96,1632],[236,1472],[236,1504],[236,1536],[236,1568],[236,1600],[236,1632],[236,1664],[46,1696],[46,1630],[46,1440],[46,1568],[46,1504],[285,1440],[285,1504],[285,1568],[285,1632],[285,1696]],"translate":[-147,-384],"mutationVectors":[{"type":"deform","origin":[-227,-407],"name":"New Mutator (18)","radius":64},{"type":"deform","origin":[-73,-496],"name":"New Mutator (17)","radius":63},{"name":"New Mutator (16)","type":"translate","origin":[0,0],"radius":-1}],"name":"Rook"},{"type":"sprite","points":[[1129,1236],[1129,1201],[1125,1160],[1141,1159],[1143,1197],[1145,1237],[1160,1238],[1158,1199],[1161,1160],[1175,1159],[1173,1200],[1174,1240]],"translate":[325,-77],"mutationVectors":[{"type":"deform","origin":[326,-121],"name":"New Mutator (23)","radius":55}],"name":"Sigar"},{"name":"Clouds","type":"folder","items":[{"type":"sprite","points":[[1038,1136],[758,1140],[758,1070],[1021,1065]],"translate":[77,-454],"mutationVectors":[{"name":"New Mutator (11)","type":"translate","origin":[0,0],"radius":-1}],"name":"Cloud1"},{"type":"sprite","points":[[1251,1049],[1258,1119],[1464,1119],[1447,1055]],"translate":[906,-458],"mutationVectors":[{"name":"New Mutator (19)","type":"translate","origin":[0,0],"radius":-1}],"name":"Cloud2"},{"type":"sprite","points":[[62,1106],[63,1159],[237,1158],[231,1107]],"translate":[-603,-444],"mutationVectors":[{"name":"New Mutator (20)","type":"translate","origin":[0,0],"radius":-1}],"name":"Could3"}],"mutationVectors":[]},{"type":"sprite","points":[[1416,1009],[1451,1020],[1456,1002],[1428,988]],"translate":[431,473],"mutationVectors":[{"type":"opacity","origin":[0,0],"name":"New Mutator (12)"}],"name":"Eyes"},{"type":"sprite","points":[[847,1204],[853,1204],[853,1217],[848,1217],[843,1220],[845,1229],[858,1227]],"translate":[-356,-247],"mutationVectors":[{"name":"New Mutator (36)","type":"translate","origin":[-356,-241],"radius":9}],"name":"Spider"},{"type":"sprite","points":[[0,0],[0,1024],[2048,1024],[2048,0]],"translate":[0,0],"mutationVectors":[],"name":"Background"}],"version":"1.0"}'));S=JSON.parse('{"name":"website","version":"1.1.0","description":"Geppetto is a free and open animation tool to embed webGL animations in a web site.","main":"../docs/lnl/index.html","author":"Matthijs Groen <matthijs.groen@gmail.com> (https://github.com/matthijsgroen)","homepage":"https://geppetto.js.org/","license":"MIT","private":true,"scripts":{"start":"parcel serve ./src/index.html","build":"parcel build ./src/index.html --no-content-hash  --public-url /lnl/"},"devDependencies":{"@parcel/transformer-image":"2.0.0-beta.2","parcel":"^2.0.0-beta.2"},"dependencies":{"geppetto-player":"^1.1.0"},"browserslist":["defaults","Chrome 63"]}');const F=t=>{const r=document.getElementById("errorBox"),a=document.createElement("p");a.textContent=e.message,r.appendChild(a)};document.addEventListener("error",(t=>{F(t.message)}));const I=document.getElementById("theatre"),P=(t=>{const e=k(t);return e.clearColor(0,0,0,1),e.enable(e.DEPTH_TEST),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),R(t)})(I),X=`https://github.com/matthijsgroen/geppetto/releases/download/${S.version}`,D=[{platform:"mac",arch:"x64",filename:`Geppetto-${S.version}-mac.dmg`},{platform:"mac",arch:"arm64",filename:`Geppetto-${S.version}-arm64-mac.dmg`},{platform:"win",filename:`Geppetto.Setup.${S.version}.exe`},{platform:"linux",arch:"amd64",filename:`geppetto_${S.version}_amd64.deb`},{platform:"linux",arch:"arm64",filename:`geppetto_${S.version}_arm64.deb`}];document.getElementById("version").innerText=`Version ${S.version}`,D.forEach((t=>{const e=document.getElementById(`download-${t.platform}`),r=document.createElement("a");r.setAttribute("href",`${X}/${t.filename}`),r.innerText=`Download ${t.arch||t.platform} version`;const a=document.createElement("li");a.appendChild(r),e.appendChild(a)})),(async()=>{try{const t=await(async t=>new Promise((e=>{const r=new Image;r.crossOrigin="anonymous",r.src=t,r.onload=()=>e(r)})))(L),e=v(U),r=P.addAnimation(e,t,0,{zoom:2,panX:0}),a=I.getBoundingClientRect();I.width=a.width*window.devicePixelRatio,I.height=a.height*window.devicePixelRatio,r.startTrack("Wheel"),r.startTrack("WheelBlades"),r.startTrack("Tree"),r.startTrack("Bird"),r.startTrack("Cloud1",{speed:.15}),r.startTrack("Cloud2",{speed:.1}),r.startTrack("Cloud3",{speed:.15}),r.startTrack("Eyes"),r.startTrack("Smoke"),r.startTrack("Water");let o=[];const n=t=>{o=o.filter((e=>e.name!==t))},i=(t,e,r,a,i)=>new Promise((s=>{n(t);let l=e;o=o.concat({name:t,ticker:()=>{l===r?(n(t),s()):l<r?l+=Math.min(a,r-l):l-=Math.min(a,l-r),i(l)}})})),s=(t,e)=>new Promise((r=>{n(t);let a=e;o=o.concat({name:t,ticker:()=>{0===a?(n(t),r()):a--}})}));(async()=>{const t=.0025,e={x:.72,y:.87,z:.8},a=.51,o=.29,n=.95,l={...e};r.setControlValue("ButterflyX",l.x),r.setControlValue("ButterflyY",l.y),r.setControlValue("ButterflyZoom",l.z),r.startTrack("ButterflyWings",{speed:.2}),await s("bfParked",320);let u=!1;const c=(e,a,o)=>(u||(r.startTrack("ButterflyWings"),u=!0),e<l.x?r.setControlValue("ButterflyTurn",0):r.setControlValue("ButterflyTurn",1),Promise.all([i("ButterflyX",l.x,e,t,(t=>{l.x=t,r.setControlValue("ButterflyX",t)})),i("ButterflyY",l.y,a,t,(t=>{l.y=t,r.setControlValue("ButterflyY",t)})),i("ButterflyZoom",l.z,o,.025,(t=>{l.z=t,r.setControlValue("ButterflyZoom",t)}))])),m=()=>{const t=.3*Math.random();let e=Math.random()>.5?1:-1,r=Math.random()>.5?1:-1;(l.x+e*t>1||l.x+e*t<0)&&(e*=-1),(l.y+r*t>1||l.y+r*t<0)&&(r*=-1);const a=l.x+e*t,o=l.y+r*t,n=Math.min(Math.max(l.z+Math.random()*t,0),1);return c(a,o,n)};for(;;){const t=Math.random();t>.95?(await c(e.x,e.y,e.z),u&&(r.startTrack("ButterflyWings",{speed:.2}),u=!1),await s("bfParked",320)):t<.05?(await c(a,o,n),u&&(r.startTrack("ButterflyWings",{speed:.2}),u=!1),await s("bfParked",320)):await m()}})();const l=()=>{for(const t of o)t.ticker();P.render(),r.render(),window.requestAnimationFrame(l)};window.requestAnimationFrame(l)}catch(t){F(t.message)}})();
//# sourceMappingURL=index.56607182.js.map
