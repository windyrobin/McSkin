var MCSkin = require("./mmskin.js");


var util = require("util");
function debug(obj){
  console.log(util.inspect(obj));
}

function microtime(get_as_float) {  
    var now = new Date().getTime() / 1000;  
    var s = parseInt(now);
    return (get_as_float) ? now : (Math.round((now - s) * 1000) / 1000) + ' ' + s;  
}

//debug(MCSkin);
MCSkin.init(null, null, 4);

const TEST_NUMBER = 100000;
var count = 0;

MCSkin.set("key" ,"value" ,function(err ,data){
  if(err)
    console.log("==set error");
  else 
    console.log("set ok");
});

function benchGet(){
	var start = microtime(true);
  var end;
  for(var i=0;i<TEST_NUMBER;i++){
    MCSkin.get("key",function(err ,data){
      count ++;  
      if(err){
        console.log("==test get err");
      }else{
        //console.log("data : " + data);
      }
      if(count >= TEST_NUMBER){
        MCSkin.destroy();
      }
    })
  }
}

setInterval(function(){
 if(count <= TEST_NUMBER){
	 console.log("count : " + count);
 }
 console.log( "rss : " + process.memoryUsage().rss);
}, 10000);

setTimeout(function(){
  benchGet();
}, 1000);
