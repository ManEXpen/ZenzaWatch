var assert = require('assert');
var nicos = require('../src/NicoScripter.js');


describe('hoge', function() {
  assert.equal(nicos.hoge(), true);
});

describe('parseParams', function() {
  ///replace(target:'owner',src:'~',dest:"\r")
  var str = 'target:\'owner\',src:\'~\',dest:"\\r", dest2: \'シングルクォート中では\\rエスケープされない\'';
  var p = nicos.parseParams(str);

  assert.equal(p.target, 'owner');
  assert.equal(p.src,    '~');
  assert.equal(p.dest,   '\n', '改行は全て\\nに');
  assert.equal(p.dest2,  'シングルクォート中では\\rエスケープされない');

});


// /replace(target:'owner user',src:'~',dest:"\r");/replace(target:'owner user',src:'И',dest:"██");/replace(target:'owner user',src:'Щ',dest:"▇▇");/replace(target:'owner user',src:'Ы',dest:"　　");/replace(target:'owner user',src:'Ф',dest:"  "); B="█"; S="　"; N=" \n"; F=" \n+ \n+ \n+ \n+ \n+ \n+ \n+ \n+ \n+ \n"
// /def_kari("ss", $1.color=$2; $1.x=$3; $1.y=$4; $1.width=$5; $1.height=$6; $1.alpha=$7||0; $1.shape="rect"; $1.mover=""; $1.pos=""; ($8!=nil).alt(($8.indexOf("c")>=0).alt($1.shape="circle"); ($8.indexOf("sm")>=0).alt($1.mover="smooth");($8.indexOf("si")>=0).alt($1.mover="simple"); ($8.indexOf("hu")>=0).alt($1.pos="hidariue")))
// /def_kari("tt", $1.color=$2; $1.x=$3; $1.y=$4; $1.scale=$5; $1.text=$6; $1.alpha=$7||0; $1.filter=""; $1.mover=""; $1.bold=false; $1.pos=""; ($8!=nil).alt(($8.indexOf("k")>=0).alt($1.filter="kasumi"); ($8.indexOf("f")>=0).alt($1.filter="fuchi"); ($8.indexOf("b")>=0).alt($1.bold=true); ($8.indexOf("sm")>=0).alt($1.mover="smooth"); ($8.indexOf("si")>=0).alt($1.mover="simple"); ($8.indexOf("hu")>=0).alt($1.pos="hidariue")))
describe('splitLines', function() {
  var str = '/replace(target:\'owner user\',src:\'~\',dest:"\\r");     /replace(target:\'owner user\',src:\'И;;;;\',dest:"██")   ;/replace(target:\'owner user\',src:\'Щ\',dest:"▇▇");/replace(target:\'owner user\',src:\'Ы\',dest:"　　");/replace(target:\'owner user\',src:\'Ф\',dest:"  "); B="█"; S="　"; N=" \n"; F=" \n+ \n+ \n+ \n+ \n+ \n+ \n+ \n+ \n+ \n"';
  var p = nicos.splitLines(str);
  console.log(JSON.stringify(p));

  assert.equal(p.length, 9);
  assert.equal(p[1], '/replace(target:\'owner user\',src:\'И;;;;\',dest:"██")', '前後のスペースは除去');

});

