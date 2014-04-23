var from;
var to;
var chatManager;
var emojiManager;
var socket;
$(document).ready(function(){
  chatManager = new $.ChatManager();
  chatManager.init();
  emojiManager = new $.EmojiManager();
  emojiManager.init();
});
/*定义聊天页面管理类*/
(function($){
  $.ChatManager = function(){
    this.settings = $.extend(true,{},$.ChatManager.defaults);
  };
  $.extend($.ChatManager,{
    defaults:{
      SAY: "#say",  //发送按钮
      CONTENS: "#contents", //消息展示区域
      CONTENS_INPUT:"#input_content", //消息待发区
      USER_LIST:"#list",  //用户列表
      LOG_OUT:"#logout_lable", //退出登录按钮
      FORM:"#from", //消息发送人
      TO:"#to", //消息接收人
      EMOJI: "#emoji",  //兔斯基表情按钮
      keyCode_F5:115, //F5按钮
      keyCode_enter:13, //回车键
      ev_online:"online", //上线事件
      ev_offline:"offline", //下线事件
      disconnect:"disconnect",//断线
      reconnect:"reconnect", //重连
      ev_say:"say"  //说话事件
    },
    prototype: {
      init:function(){
        this.bindEvents();
        this.bindSocketEvents();
      },
      /*初始化事件绑定*/
      bindEvents:function(){
        var _this = this;
        $(_this.settings.SAY).bind("click", function(){
          _this.sendMsg();
        });
        $(_this.settings.EMOJI).bind("click",function(){
         
        });
        $(_this.settings.LOG_OUT).bind("click", function(){
          window.location.href="/logout";
        });
      },
      bindKeyBoardEvents:function(){
        var _this = this;
        $(window).keydown(function (e) {
          if (e.keyCode == _this.settings.keyCode_F5) {
            if (!confirm("刷新将会清除所有聊天记录，确定要刷新么？")) {
              e.preventDefault();
            }
          }
          if (e.keyCode == _this.settings.keyCode_enter) {
            $(_this.settings.SAY).click();
          }
        });
      },
      bindSocketEvents: function() {
        var _this = this;
        socket = io.connect();
        from = $.cookie('user');//从 cookie 中读取用户名，存于变量 from
        to = 'all';//设置默认接收对象为"所有人"
        //发送用户上线信号
        socket.emit(_this.settings.ev_online,{user: from});
        socket.on(_this.settings.ev_online, function(data){
          //显示系统消息
          var sys;
          if (data.user != from) {
            sys = '<div style="color:#f00">系统(' + now() + '):' + '用户 ' + data.user + ' 上线了！</div>';
          } else {
            sys = '<div style="color:#f00">系统(' + now() + '):你进入了聊天室！</div>';
          }
          $(_this.settings.CONTENS).append(sys + "<br/>");
          //刷新用户在线列表
          _this.flushUsers(data.users);
          //显示正在对谁说话
          _this.showSayTo();
        });
        socket.on(_this.settings.ev_say, function(data) {
          //将消息中的表情转换为图片
          var msg = emojiManager.showEmoji(data.msg);
          //对所有人说
          if(data.to == 'all'){
            $(_this.settings.CONTENS).append('<div>' + data.from + '(' + now() + ')对 所有人 说：<br/>' + msg + '</div><br />');
          }
          if(data.to == from){
            $(_this.settings.CONTENS).append('<div style="color:#00f" >' + data.from + '(' + now() + ')对 你 说：<br/>' + msg + '</div><br />');
          }
          _this.scrollEnd();
        });
        socket.on(_this.settings.ev_offline, function (data) {
          //显示系统消息
          var sys = '<div style="color:#f00">系统(' + now() + '):' + '用户 ' + data.user + ' 下线了！</div>';
          $(_this.settings.CONTENS).append(sys + "<br/>");
          //刷新用户在线列表
          _this.flushUsers(data.users);
          //如果正对某人聊天，该人却下线了
          if (data.user == to) {
            to = "all";
          }
          //显示正在对谁说话
          _this.showSayTo();
        });
        //服务器关闭
        socket.on(_this.settings.disconnect, function() {
          var sys = '<div style="color:#f00">系统:连接服务器失败！</div>';
          $(_this.settings.CONTENS).append(sys + "<br/>");
          $(_this.settings.list).empty();
        });
        //重新启动服务器
        socket.on(_this.settings.reconnect, function() {
          var sys = '<div style="color:#f00">系统:重新连接服务器！</div>';
          $(_this.settings.CONTENS).append(sys + "<br/>");
          socket.emit(_this.settings.ev_online, {user: from});
        });
      },
      //刷新用户在线列表
      flushUsers: function (users){
        var _this = this;
        //清空之前用户列表。添加‘所有人’选项并默认为灰色选中效果
        $(_this.settings.USER_LIST).empty().append('<li title="双击聊天" alt="all" class="sayingto" onselectstart="return false">所有人</li>');
        //遍历生成永不在线列表
        for (var i in users) {
          $(_this.settings.USER_LIST).append('<li alt="' + users[i] + '" title="双击聊天" onselectstart="return false">' + users[i] + '</li>');
        }
        //双击对默认聊天
        $(_this.settings.USER_LIST+" > li").dblclick(function(){
          //如果不是双击的用户为说话对象
          to = $(this).attr('alt');
          //清除之前选中的效果
          $(_this.settings.USER_LIST+" > li").removeClass('sayingto');
          //给被双击的用户添加选中效果
          $(this).addClass('sayingto');
          //刷新正在对谁说话
          _this.showSayTo();
        });
      },
      showSayTo: function() {
        var _this = this;
        $(_this.settings.FORM).html(from);
        $(_this.settings.TO).html(to == "all" ? "所有人" : to);
      },
      scrollEnd: function(){
        var _this = this;
        $(_this.settings.CONTENS).scrollTop($(_this.settings.CONTENS)[0].scrollHeight);
      },
      sendMsg: function() {
        var _this = this;
        //获取要发送的信息
        var $msg = $(_this.settings.CONTENS_INPUT).html();
        if($msg == ''|| $msg=="<br>"){
          return ;
        }
        //将消息中的表情转换为图片
        $msg = emojiManager.showEmoji($msg);
        //把发送的信息先添加到自己的浏览器DOM中
        if (to == "all") {
          $(_this.settings.CONTENS).append('<div>你(' + now() + ')对 所有人 说：<br/>' + $msg + '</div><br />');
        } else {
          $(_this.settings.CONTENS).append('<div style="color:#00f" >你(' + now() + ')对 ' + to + ' 说：<br/>' + $msg + '</div><br />');
        }
        //发送发话信息
        socket.emit(_this.settings.ev_say, {from: from, to: to, msg: $msg});
        _this.scrollEnd();
        //清空输入框并获得焦点
        $(_this.settings.CONTENS_INPUT).html('').focus();
      }
      
    }
  });
})(jQuery);

(function($){
  $.EmojiManager = function(){
    this.settings = $.extend(true,{},$.EmojiManager.defaults);
  }
  $.extend($.EmojiManager, {
    defaults: {
      emojiWrapper:"#emojiWrapper"
    },
    prototype: {
      init: function(){
        this.initialEmoji();
        this.bindEvents();
      },
      bindEvents: function(){
        document.getElementById('emoji').addEventListener('click', function(e) {
          var emojiwrapper = document.getElementById('emojiWrapper');
            emojiwrapper.style.display = 'block';
            e.stopPropagation();
          }, false);
        document.body.addEventListener('click', function(e) {
          var emojiwrapper = document.getElementById('emojiWrapper');
          if (e.target != emojiwrapper) {
            emojiwrapper.style.display = 'none';
          };
        });
        document.getElementById('emojiWrapper').addEventListener('click', function(e) {
          //获取被点击的表情
          var target = e.target;
          if (target.nodeName.toLowerCase() == 'img') {
            var messageInput = $('#input_content').html();
            $("#input_content").focus();
            $("#input_content").html(messageInput + '[emoji:' + target.title + ']');
          };
        }, false);
      },
      initialEmoji: function() {
        var emojiContainer = document.getElementById('emojiWrapper'),
            docFragment = document.createDocumentFragment();
        for (var i = 69; i > 0; i--) {
            var emojiItem = document.createElement('img');
            emojiItem.src = '../images/emoji/' + i + '.gif';
            emojiItem.title = i;
            docFragment.appendChild(emojiItem);
        };
        emojiContainer.appendChild(docFragment);
      },
      showEmoji: function(msg) {
        var match, result = msg,
            reg = /\[emoji:\d+\]/g,
            emojiIndex,
            totalEmojiNum = document.getElementById('emojiWrapper').children.length;
        while (match = reg.exec(msg)) {
          emojiIndex = match[0].slice(7, -1);
          if (emojiIndex > totalEmojiNum) {
            result = result.replace(match[0], '[X]');
          } else {
            result = result.replace(match[0], '<img class="emoji" src="../images/emoji/' + emojiIndex + '.gif" />');
          };
        };
        return result;
      }
    }
  });
})(jQuery);

function now() {
  var date = new Date();
  var time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + (date.getMinutes() < 10 ? ('0' + date.getMinutes()) : date.getMinutes()) + ":" + (date.getSeconds() < 10 ? ('0' + date.getSeconds()) : date.getSeconds());
  return time;
}
