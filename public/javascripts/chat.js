var from;
var to;
$(document).ready(function(){
  $(window).keydown(function (e) {
    if (e.keyCode == 116) {
      if (!confirm("刷新将会清除所有聊天记录，确定要刷新么？")) {
        e.preventDefault();
      }
    }
    if (e.keyCode == 13) {
      $("#say").click();
    }
  });

	var socket = io.connect();

	from = $.cookie('user');//从 cookie 中读取用户名，存于变量 from
	to = 'all';//设置默认接收对象为"所有人"
	//发送用户上线信号
	socket.emit('online', {user: from});
	socket.on('online', function (data) {
	  //显示系统消息
    var sys;
	  if (data.user != from) {
	    sys = '<div style="color:#f00">系统(' + now() + '):' + '用户 ' + data.user + ' 上线了！</div>';
	  } else {
	    sys = '<div style="color:#f00">系统(' + now() + '):你进入了聊天室！</div>';
	  }
	  $("#contents").append(sys + "<br/>");
	  //刷新用户在线列表
	  flushUsers(data.users);
	  //显示正在对谁说话
	  showSayTo();
	});
  socket.on('say', function(data) {
    //将消息中的表情转换为图片
    var msg = showEmoji(data.msg);
    //对所有人说
    if(data.to == 'all'){
       $("#contents").append('<div>' + data.from + '(' + now() + ')对 所有人 说：<br/>' + msg + '</div><br />');
    }
    if(data.io == from){
      $("#contents").append('<div style="color:#00f" >' + data.from + '(' + now() + ')对 你 说：<br/>' + msg + '</div><br />');
    }
    scrollEnd();
  });
  socket.on('offline', function (data) {
    //显示系统消息
    var sys = '<div style="color:#f00">系统(' + now() + '):' + '用户 ' + data.user + ' 下线了！</div>';
    $("#contents").append(sys + "<br/>");
    //刷新用户在线列表
    flushUsers(data.users);
    //如果正对某人聊天，该人却下线了
    if (data.user == to) {
      to = "all";
    }
    //显示正在对谁说话
    showSayTo();
  });

  //发话
  $("#say").click(function() {
    //获取要发送的信息
    var $msg = $('#input_content').html();
    if($msg == ''|| $msg=="<br>"){
      return ;
    }
    //将消息中的表情转换为图片
    $msg = showEmoji($msg);
    //把发送的信息先添加到自己的浏览器DOM中
    if (to == "all") {
      $("#contents").append('<div>你(' + now() + ')对 所有人 说：<br/>' + $msg + '</div><br />');
    } else {
      $("#contents").append('<div style="color:#00f" >你(' + now() + ')对 ' + to + ' 说：<br/>' + $msg + '</div><br />');
    }
    //发送发话信息
    socket.emit('say', {from: from, to: to, msg: $msg});
    scrollEnd();
    //清空输入框并获得焦点
    $("#input_content").html('').focus();
  });
  //退出登录
  $("#logout_lable").click(function() {
      window.location.href="/logout";
    });
  //服务器关闭
  socket.on('disconnect', function() {
    var sys = '<div style="color:#f00">系统:连接服务器失败！</div>';
    $("#contents").append(sys + "<br/>");
    $("#list").empty();
  });

  //重新启动服务器
  socket.on('reconnect', function() {
    var sys = '<div style="color:#f00">系统:重新连接服务器！</div>';
    $("#contents").append(sys + "<br/>");
    socket.emit('online', {user: from});
  });
  initialEmoji();
  $("#emoji").click(function() {
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
});
function initialEmoji() {
    var emojiContainer = document.getElementById('emojiWrapper'),
        docFragment = document.createDocumentFragment();
    for (var i = 69; i > 0; i--) {
        var emojiItem = document.createElement('img');
        emojiItem.src = '../images/emoji/' + i + '.gif';
        emojiItem.title = i;
        docFragment.appendChild(emojiItem);
    };
    emojiContainer.appendChild(docFragment);
}
function showEmoji(msg) {
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

//刷新用户在线列表
function flushUsers(users){
  //清空之前用户列表。添加‘所有人’选项并默认为灰色选中效果
  $("#list").empty().append('<li title="双击聊天" alt="all" class="sayingto" onselectstart="return false">所有人</li>');
  //遍历生成永不在线列表
  for (var i in users) {
  	$("#list").append('<li alt="' + users[i] + '" title="双击聊天" onselectstart="return false">' + users[i] + '</li>');
  }
  //双击对默认聊天
  $("#list > li").dblclick(function(){
  	//如果不是双击的用户为说话对象
  	to = $(this).attr('alt');
  	//清除之前选中的效果
  	$("#list > li").removeClass('sayingto');
  	//给被双击的用户添加选中效果
  	$(this).addClass('sayingto');
  	//刷新正在对谁说话
  	showSayTo();
  });
}

function showSayTo() {
  $("#from").html(from);
  $("#to").html(to == "all" ? "所有人" : to);
}

function now() {
  var date = new Date();
  var time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + (date.getMinutes() < 10 ? ('0' + date.getMinutes()) : date.getMinutes()) + ":" + (date.getSeconds() < 10 ? ('0' + date.getSeconds()) : date.getSeconds());
  return time;
}
function scrollEnd(){
  $('#contents').scrollTop($('#contents')[0].scrollHeight);
}