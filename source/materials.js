import * as THREE from 'three';

// Visualization presets, not recovered Revit render materials.
// World-space procedural shading avoids needing UVs or online textures.
export function classifySurface(element, part) {
  const name = element.name.toLowerCase();
  const type = element.type.toLowerCase();
  const [r,g,b,a] = part.color;
  const mean = (r+g+b)/3;
  if (a < .65 || (b > r+.2 && /plate|window/.test(type))) return 'glass';
  if (/hoki[e]?stone|limestone/.test(name)) return 'stone';
  if (/railing|member|beam/.test(type) || /mullion|steel|w shapes|alumin/.test(name)) return 'metal';
  if (/door|window/.test(type) && r > b*1.3 && r > g*1.12) return 'wood';
  if (/roof|vapor|membrane/.test(name)) return 'roof';
  if (/concrete|footing|foundation/.test(name) || /column|stairflight|rampflight/.test(type)) return 'concrete';
  if (/exterior/.test(name)) return mean < .6 ? 'stone' : 'plaster';
  if (/slab/.test(type)) return 'concrete';
  if (/door|window/.test(type)) return 'paintedMetal';
  return 'plaster';
}

const noiseGLSL = `
varying vec3 vFinishPosition;
varying vec3 vFinishNormal;
float hashFinish(vec3 p) {
 p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);
}
float noiseFinish(vec3 p) {
 vec3 i=floor(p), f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hashFinish(i),hashFinish(i+vec3(1,0,0)),f.x),mix(hashFinish(i+vec3(0,1,0)),hashFinish(i+vec3(1,1,0)),f.x),f.y),mix(mix(hashFinish(i+vec3(0,0,1)),hashFinish(i+vec3(1,0,1)),f.x),mix(hashFinish(i+vec3(0,1,1)),hashFinish(i+vec3(1,1,1)),f.x),f.y),f.z);
}
`;

function addFinish(material, kind) {
  if (!['stone','concrete','plaster','roof','wood'].includes(kind)) return;
  material.customProgramCacheKey=()=>`bfh-finish-v2-${kind}`;
  material.onBeforeCompile=shader=>{
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFinishPosition;\nvarying vec3 vFinishNormal;');
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vFinishPosition=(modelMatrix*vec4(transformed,1.)).xyz;
      vFinishNormal=normalize(mat3(modelMatrix)*objectNormal);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+noiseGLSL);
    let finish;
    if(kind==='stone') finish=`
      vec3 wn=abs(normalize(vFinishNormal));
      vec2 uv=wn.y>.65?vFinishPosition.xz:(wn.x>wn.z?vFinishPosition.zy:vFinishPosition.xy);
      float course=floor(uv.y/.24);
      float rowOffset=hashFinish(vec3(course,2.,6.))*.75;
      vec2 brickUV=vec2((uv.x+rowOffset)/.55,uv.y/.24);
      vec2 cell=floor(brickUV), within=fract(brickUV);
      vec2 edge=min(within,1.-within)*vec2(.55,.24);
      float joint=smoothstep(.002,.012,min(edge.x,edge.y));
      float stoneTone=hashFinish(vec3(cell,0.));
      float grain=noiseFinish(vFinishPosition*18.);
      float broad=noiseFinish(vFinishPosition*4.);
      float mottling=mix(.76,1.20,stoneTone)*mix(.90,1.08,grain)*mix(.9,1.05,broad);
      diffuseColor.rgb*=mix(.55,mottling,joint);
      float finishHeight=joint*.005+(grain-.5)*.003;
    `;
    else if(kind==='wood') finish=`
      float grain=noiseFinish(vFinishPosition*vec3(45.,1.2,45.));
      float fine=noiseFinish(vFinishPosition*vec3(100.,2.,100.));
      diffuseColor.rgb*=mix(.8,1.13,grain)*mix(.96,1.03,fine);
      float finishHeight=grain*.0007;
    `;
    else finish=`
      float grain=noiseFinish(vFinishPosition*${kind==='roof'?'90.':'38.'});
      float broad=noiseFinish(vFinishPosition*2.);
      diffuseColor.rgb*=mix(${kind==='concrete'?'.90,1.08':'.96,1.04'},broad)*mix(.97,1.02,grain);
      float finishHeight=(grain-.5)*${kind==='concrete'?'.0015':'.00045'};
    `;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+finish);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec3 fx=dFdx(-vViewPosition),fy=dFdy(-vViewPosition);
      vec3 r1=cross(fy,normal),r2=cross(normal,fx);
      float det=dot(fx,r1);
      vec3 grad=sign(det)*(dFdx(finishHeight)*r1+dFdy(finishHeight)*r2);
      normal=normalize(abs(det)*normal-grad);
    `);
  };
}

export function createMaterialPair(element, part) {
  const kind=classifySurface(element,part);
  const color=new THREE.Color().setRGB(...part.color.slice(0,3),THREE.SRGBColorSpace);
  const alpha=part.color[3];
  const original=new THREE.MeshStandardMaterial({color,roughness:.78,metalness:0,side:THREE.DoubleSide,transparent:alpha<.99,opacity:alpha,depthWrite:alpha>=.99});
  const c=color.clone();
  let roughness=.85,metalness=0;
  if(kind==='stone'){c.lerp(new THREE.Color('#a5a197'),.32);roughness=.92;}
  if(kind==='concrete'){c.lerp(new THREE.Color('#b9b9b2'),.25);roughness=.9;}
  if(kind==='plaster'){c.multiplyScalar(.92);roughness=.88;}
  if(kind==='roof'){c.lerp(new THREE.Color('#4d5559'),.45);roughness=.96;}
  if(kind==='wood'){roughness=.46;}
  if(kind==='metal'){metalness=.82;roughness=.32;c.lerp(new THREE.Color('#abb5bd'),.15);}
  if(kind==='paintedMetal'){metalness=.12;roughness=.42;}
  let realistic;
  if(kind==='glass'){
    realistic=new THREE.MeshPhysicalMaterial({color:'#d2e5e9',roughness:.075,metalness:0,transmission:.82,thickness:.025,ior:1.5,reflectivity:.65,envMapIntensity:1.3,side:THREE.DoubleSide,opacity:1,transparent:false,depthWrite:true});
  } else {
    realistic=new THREE.MeshStandardMaterial({color:c,roughness,metalness,side:THREE.DoubleSide,transparent:alpha<.99,opacity:alpha,depthWrite:alpha>=.99});
    addFinish(realistic,kind);
  }
  for(const m of [original,realistic]){
    m.clipShadows=true;
    m.userData.baseOpacity=m.opacity;
    m.userData.baseTransmission=m.transmission||0;
    m.userData.kind=kind;
  }
  return {kind,original,realistic};
}
