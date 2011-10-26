var memcache = require("memcache.js");

var reqs = [];
var clients = [];
var closeFlag = false;

function output(str){
  console.log(str);
}

function debug(obj){
  console.log(require("util").inspect(obj));
}

exports.init = function(host, port ,pool_size){
  closeFlag = false;
  for(var i=0 ;i<pool_size; i++){
    clients.push(new Client(host ,port));
  }
}

exports.get = function(){
  reqs.push({"action" : "get" , args : arguments});
  doCheckFree();
}

exports.set = function(){
  reqs.push({"action" : "set" , args : arguments});
  doCheckFree();
}

exports.destroy = function(){
  closeFlag = true;
  clients.forEach(function(c){
    c.conn.close();
  });
}

function Client(host ,port){
  this.conn = new memcache.Client(host ,port);
  this.conn.connect();
  this.req_count = 0;
  this.cur_req = null;
  this.state = "Connecting";
  var self = this;
  this.conn.on("connect", function(){
    output("a client open");
    self.req_count = 0;
    self.state = "Idle";
    doCheckFree();
  });
  this.conn.on("close", function(){
    output("a client close");
    output("req count :" + self.req_count);
    self.state = "Closed";
    self.errorHandle();
  });
  this.conn.on("timeout", function(){
    output("timeout occured");
    self.state = "Timeout";    
    self.errorHandle();
  });
  this.conn.on("error", function(){
    output("an error occured");
    self.state = "Error";
    self.errorHandle();
  });
}

function doCheckFree(){
  for(var i=0; i<clients.length; i++){
    var c = clients[i];
    var req = null;
    if(c.state != "Busy" && c.state != "Connecting"){
      if(c.state == "Idle"){
        if(c.cur_req){//deal old request ,this means reconnect succeed
          //output("deal old request ,maybe reconnect succeed");          
          c.doReq();
        }else if(req = reqs.shift()){
          //output("bind and do new request");
          c.bindReq(req);
          c.doReq();
          c.req_count++;
        }
      }else if(req = reqs.shift()){//if error or timeout occurred ,reconnect
        //output("maybe error occurred reconnect...");
        c.req_count++;
        c.bindReq(req);
        c.conn.connect();
        c.state = "Connecting";
      }
    }
  }
}

function isFunction(functionToCheck){
   var getType = {};
   return functionToCheck && getType.toString.call(functionToCheck) == '[object Function]';
}

Client.prototype.bindReq = function(req){
  var args = req.args; 
  var nArgs = [];
  for(var i=0; i<args.length ;i++){
    var arg = args[i];
    if(isFunction(arg)){
      //store origianl callback to client object ,and use c.callback as a agent,
      this.cur_req_cb = arg;
      var self = this;
      arg = function (){
        self.callBack.apply(self, arguments);
      }
    }  
    nArgs.push(arg);
  }
  req.args = nArgs;
  this.cur_req = req;
}

Client.prototype.doReq = function(){
  //debug(this.cur_req_cb);
  this.conn[this.cur_req.action].apply(this.conn, this.cur_req.args);
  this.state = "Busy";
}

//this means succuss
Client.prototype.callBack = function(){
  //output("do callback");
  //output("cur cb ");
  //debug(this.cur_req_cb);
  this.state = "Idle";
  this.cur_req_cb.apply(null, arguments);
  this.cur_req_cb = null;
  this.cur_req = null;

  doCheckFree();
}

//in this situation ,clinet.callback has no chance to be called,
//callback error
Client.prototype.errorHandle = function(){
  //output("error handler" + this.state);
  if(this.cur_req_cb){
    this.cur_req_cb.call(null, this.state);
    this.cur_req_cb = null;
    this.cur_req = null;
  }
  //maybe we really want to close it
  //if(this.state != "Closed")
  if(closeFlag === false)
    doCheckFree();
}
