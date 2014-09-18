(function(){function AsyncGroup(){this.m_next_id=0;this.m_handles={};this.m_ajax={};}
AsyncGroup.prototype.Set=function(handler,delay){var id=++this.m_next_id;var group=this;this.m_handles[id]=setTimeout(function(){delete group.m_handles[id];handler();},delay);return id;}
AsyncGroup.prototype.Clear=function(id){if(this.m_handles.hasOwnProperty(id)){clearTimeout(this.m_handles[id]);delete this.m_handles[id];return true;}
return false;}
AsyncGroup.prototype.ClearAll=function(){for(var id in this.m_handles){clearTimeout(this.m_handles[id]);}
this.m_handles={};for(var id in this.m_ajax){this.m_ajax[id].ag_cancelled=true;this.m_ajax[id].abort();}
this.m_ajax={};}
AsyncGroup.prototype.AddAjax=function(handle){var id=++this.m_next_id;handle.ag_id=id;handle.ag_cancelled=false;this.m_ajax[id]=handle;handle.always(function(){RemoveAjax(handle);});return handle;}
AsyncGroup.prototype.CancelAjax=function(handle){if(handle.ag_cancelled==false){handle.ag_cancelled=true;handle.abort();return true;}
return false;}
AsyncGroup.prototype.RemoveAjax=function(handle){if(!handle.hasOwnProperty('ag_id'))return false;var id=handle.ag_id;if(this.m_ajax.hasOwnProperty(id)){delete this.m_ajax[id];delete handle.ag_id;return true;}
return false;}
window.AsyncGroup={};window.AsyncGroup.Create=function(){return new AsyncGroup();}})();
/*! Copyright (c) 2013 Brandon Aaron (http://brandon.aaron.sh)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Version: 3.1.12
 *
 * Requires: jQuery 1.2.2+
 */!function(a){"function"==typeof define&&define.amd?define(["jquery"],a):"object"==typeof exports?module.exports=a:a(jQuery)}(function(a){function b(b){var g=b||window.event,h=i.call(arguments,1),j=0,l=0,m=0,n=0,o=0,p=0;if(b=a.event.fix(g),b.type="mousewheel","detail"in g&&(m=-1*g.detail),"wheelDelta"in g&&(m=g.wheelDelta),"wheelDeltaY"in g&&(m=g.wheelDeltaY),"wheelDeltaX"in g&&(l=-1*g.wheelDeltaX),"axis"in g&&g.axis===g.HORIZONTAL_AXIS&&(l=-1*m,m=0),j=0===m?l:m,"deltaY"in g&&(m=-1*g.deltaY,j=m),"deltaX"in g&&(l=g.deltaX,0===m&&(j=-1*l)),0!==m||0!==l){if(1===g.deltaMode){var q=a.data(this,"mousewheel-line-height");j*=q,m*=q,l*=q}else if(2===g.deltaMode){var r=a.data(this,"mousewheel-page-height");j*=r,m*=r,l*=r}if(n=Math.max(Math.abs(m),Math.abs(l)),(!f||f>n)&&(f=n,d(g,n)&&(f/=40)),d(g,n)&&(j/=40,l/=40,m/=40),j=Math[j>=1?"floor":"ceil"](j/f),l=Math[l>=1?"floor":"ceil"](l/f),m=Math[m>=1?"floor":"ceil"](m/f),k.settings.normalizeOffset&&this.getBoundingClientRect){var s=this.getBoundingClientRect();o=b.clientX-s.left,p=b.clientY-s.top}return b.deltaX=l,b.deltaY=m,b.deltaFactor=f,b.offsetX=o,b.offsetY=p,b.deltaMode=0,h.unshift(b,j,l,m),e&&clearTimeout(e),e=setTimeout(c,200),(a.event.dispatch||a.event.handle).apply(this,h)}}function c(){f=null}function d(a,b){return k.settings.adjustOldDeltas&&"mousewheel"===a.type&&b%120===0}var e,f,g=["wheel","mousewheel","DOMMouseScroll","MozMousePixelScroll"],h="onwheel"in document||document.documentMode>=9?["wheel"]:["mousewheel","DomMouseScroll","MozMousePixelScroll"],i=Array.prototype.slice;if(a.event.fixHooks)for(var j=g.length;j;)a.event.fixHooks[g[--j]]=a.event.mouseHooks;var k=a.event.special.mousewheel={version:"3.1.12",setup:function(){if(this.addEventListener)for(var c=h.length;c;)this.addEventListener(h[--c],b,!1);else this.onmousewheel=b;a.data(this,"mousewheel-line-height",k.getLineHeight(this)),a.data(this,"mousewheel-page-height",k.getPageHeight(this))},teardown:function(){if(this.removeEventListener)for(var c=h.length;c;)this.removeEventListener(h[--c],b,!1);else this.onmousewheel=null;a.removeData(this,"mousewheel-line-height"),a.removeData(this,"mousewheel-page-height")},getLineHeight:function(b){var c=a(b),d=c["offsetParent"in a.fn?"offsetParent":"parent"]();return d.length||(d=a("body")),parseInt(d.css("fontSize"),10)||parseInt(c.css("fontSize"),10)||16},getPageHeight:function(b){return a(b).height()},settings:{adjustOldDeltas:!0,normalizeOffset:!0}};a.fn.extend({mousewheel:function(a){return a?this.bind("mousewheel",a):this.trigger("mousewheel")},unmousewheel:function(a){return this.unbind("mousewheel",a)}})});(function(){window.matbox=window.matbox||{};matbox.LiveRefresh=this;var m_this=this;var m_refreshing=false;var m_autorefresh_id=null;var m_queued=0;var m_agroup=AsyncGroup.Create();var m_last_comment=0;var m_num_comments=0;function DequeueNext(){m_refreshing=true;if(m_queued==0){m_refreshing=false;return;}
m_queued--;DoRefresh();}
function CancelAutoRefresh(){if(m_autorefresh_id!=null){m_timeout_group.Clear(m_autorefresh_id);m_autorefresh_id=null;}}
function SetAutoRefresh(){CancelAutoRefresh();m_autorefresh_id=m_timeout_group.Set(m_this.Refresh,33*1000);}
function ShowCommentReply(){m_timeout_group.Set(function(){matbox.ResetReplyInput();},500);DequeueNext();return;}
function ChainFadeComments(start,end){if(end<start){ShowCommentReply();return;}
var id=start;var func=function(){$('#comment'+id).css("opacity",1);id++;if(id<=end){m_timeout_group.Set(func,100);}else{ShowCommentReply();}}
m_timeout_group.Set(func,50);}
function OnAjaxDone(data){if(handle.ag_cancelled)return;if(data=='error'){DequeueNext();return;}else if(data=='expired'||data=='deleted'){m_this.Reset();RefreshContent();return;}else if(data=='wrongpage'){m_this.Reset();RefreshContent()
return;}else{data=JSON.parse(data);var startcomment=m_num_comments;var topicstate=matbox.GetPageState();for(var i=0;i<data.length;i++){var entry=data[i];if(entry.id>m_last_comment){m_last_comment=entry.id;}
if(topicstate=="live"){var html=[];html.push('<div class="reply" id="comment'+m_num_comments+'">'+entry.content);var selected=entry.vote===true?" selected":"";html.push('<div class="rvote rgood '+selected+'" id="votegood'+entry.id+'" onclick="Button.VoteCommentGood('+entry.id+')">');if(entry.vote===true){html.push('<img src="star.png" alt="good" title="good"></div>');}else{html.push('<img src="unstar.png" alt="good" title="good"></div>');}
selected=entry.vote===false?" selected":"";html.push('<div class="rvote rbad '+selected+'" id="votebad'+entry.id+'" onclick="Button.VoteCommentBad('+entry.id+')">');if(entry.vote===false){html.push('<img src="bad.png" alt="bad" title="bad"></div>');}else{html.push('<img src="notbad.png" alt="bad" title="bad"></div>');}
html.push('</div> ');}else{var html=[];html.push('<div class="reply" id="comment'+m_num_comments+'">'+entry.content);html.push('<div class="score '+ScoreRank(entry.score)+'" title="'+ScoreRankName(entry.score)+'">'+entry.score+'</div>');html.push('</div>&nbsp;');}
m_num_comments++;$('#replylist').append(html.join(""));}
ChainFadeComments(startcomment,m_num_comments-1);}}
function DoRefresh(){var topicstate=matbox.GetPageState();if(topicstate=='live'){SetAutoRefresh();}else if(topicstate!='old'){console.log("invalid live-refresh request!");Reset();return;}
var get={page:matbox.GetPage(),last:m_last_comment};if(topicstate=='old'){get.old=1;}
m_timeout_group.AddAjax($.get("liverefresh.php",get)).done(OnAjaxDone).fail(function(handle){if(handle.ag_cancelled)return;DequeueNext();return;});}
function Refresh(){var topicstate=matbox.GetPageState();if(topicstate!='live'&&topicstate!='old')return;m_queue++;if(!m_refreshing){DequeueNext();}}
function Reset(){CancelAutoRefresh();m_queued=0;m_refreshing=false;m_last_comment=0;m_num_comments=0;m_agroup.ClearAll();}
this.Reset=Reset;this.Refresh=Refresh;})();(function(){window.matbox=window.matbox||{};matbox.Loader=this;var FADE_OUT_TIME=500;var FADE_IN_TIME=500;var m_loading=false;var m_fading_out=false;var m_page_content=null;var PAGE_LOAD_FAILED_CONTENT='<div class="topic nothing" id="topic">'+'something messed up.'+'</div><!-- (the page failed to load.) -->';function FadeIn(content){matbox.InitializePreLoad();output=$('#content');$('#content').html(content);matbox.InitializePostLoad();m_loading=false;matbox.AdjustSize();output.css('opacity',1);}
this.Load=function(url,delay){if(m_loading)return;if(!isSet(delay))delay=500;if(delay<0)delay=-delay-FADE_OUT_TIME;m_loading=true;matbox.LiveRefresh.Reset();output=$('#content');output.css('opacity',0);m_fading_out=true;setTimeout(function(){m_fading_out=false;if(m_page_content!=null){FadeIn(m_page_content);m_page_content=null;}else{output.html("");}},FADE_OUT_TIME+delay);$.get(url).done(function(data){if(m_fading_out){m_page_content=data;}else{FadeIn(data);}}).fail(function(){if(g_loading_fading_out){m_page_content=PAGE_LOAD_FAILED_CONTENT;}else{FadeIn(PAGE_LOAD_FAILED_CONTENT);}});}
this.RefreshContent=function(){this.Load('content.php');}
this.IsLoading=function(){return m_loading;}
this.SetLoading=function(){m_loading=true;}})();function isSet(a){return(typeof a)!=='undefined';}
(function(){window.matbox=window.matbox||{};console.log('hi');var m_compose_sending=false;var m_page=0;var m_page_state="none";var m_replytime=0;var m_timeouts=AsyncGroup.Create();var images=new Array();function preload(){for(i=0;i<preload.arguments.length;i++){images[i]=new Image();images[i].src=preload.arguments[i];}}
preload("bad.png","star.png");function GetTime(){return new Date().getTime();}
function ReadText(element){mb=$('#magicbox');var content=$(element).html();content=content.replace(/<br>/g,'[[br]]');mb.html(content);return mb.text().trim();}
function SubmitComposition(){if(matbox.Loader.IsLoading())return false;if(m_compose_sending)return false;if($('#composition').text().trim()==""){return false;}
var content=ReadText($('#composition'));m_compose_sending=true;$("#composition").attr('contentEditable',false);HideSubmit();m_timeouts.AddAjax($.post("compose.php",{text:content,page:m_page})).done(function(data){if(data=='error'){alert('couldn\'t post topic.');m_compose_sending=false;$("#composition").attr('contentEditable',true);ShowSubmit($("#composition"));}else if(data=='expired'){matbox.Loader.Load('error.php?expired');}else if(data=='empty'){matbox.Loader.Load('error.php?emptycomposition');}else if(data=='toolong'){matbox.Loader.Load('error.php?toolong');}else if(data=='wrongpage'){matbox.Loader.Load('error.php?messedup');}else{RefreshContent();}}).fail(function(handle){if(handle.ag_cancelled)return;alert('couldn\'t post topic.');m_compose_sending=false;$("#replyinput").attr('contentEditable',true);ShowSubmit($("#composition"));});}
function SubmitComment(){if(matbox.Loader.IsLoading())return false;if(m_compose_sending)return false;if($('#replyinput').text().trim()==""){return false;}
var content=ReadText($('#replyinput'));m_compose_sending=true;$("#replyinput").attr('contentEditable',false);HideSubmit();function reopeninput(){m_compose_sending=false;$("#replyinput").attr('contentEditable',true);ShowSubmit($("#replyinput"));}
m_timeouts.AddAjax($.post("reply.php",{text:content,page:m_page})).done(function(data){var reopeninput=false;if(data=='error'){alert('couldn\'t post comment.');reopeninput();}else if(data=='wrongpage'){alert('something messed up.');RefreshContent();}else if(data=='expired'){alert('too late.');RefreshContent();}else if(data=='tooshort'){alert('too short.');reopeninput();}else if(data=='toolong'){alert('too long.');reopeninput();}else if(data=='pleasewait'){alert('please wait a while first.');reopeninput();}else{m_replytime=GetTime();$("#replyinputbox").addClass('fade');$("#replyinputbox").css('opacity',0);$("#replyinputbox").css('cursor','default');m_timeouts.Set(LiveRefresh.Refresh,500);}}).fail(function(handle){if(handle.ag_cancelled)return;alert('couldn\'t post comment.');reopeninput();});}
function HideSubmit(){var submit=$("#submit");submit.attr('disabled','disabled');submit.css('opacity',0.0);submit.css('cursor','default');}
function ShowSubmit(parent){var submit=$("#submit");if(parent.text().trim()!=""){submit.css('opacity',1.0);submit.css('cursor','pointer');}else{HideSubmit();}}
matbox.ResetReplyInput=function(){var rpi=$('#replyinputbox');if(!rpi.hasClass('fade')){rpi.css("opacity",1);}else{if(GetTime()>matbox.GetLastReplyTime()+10000){rpi.removeClass('fade');rpi.css('opacity',1);rpi.css('cursor','inherit');m_compose_sending=false;$("#replyinput").attr('contentEditable',true);$("#replyinput").html('');$("#replyinput").addClass('init');}}}
function CompositionKeyPressed(){matbox.AdjustTop();if(!m_compose_sending){ShowSubmit($("#composition"));}}
function ReplyKeyPressed(){if(!m_compose_sending){ShowSubmit($("#replyinput"));}}
function CloseOld(){if(matbox.Loader.IsLoading())return;if(m_topic_state!='old')return;matbox.Loader.SetLoading();m_timeouts.AddAjax($.post("closeold.php",{page:m_page})).always(function(){RefreshContent();});}
function ScoreRank(a){if(a<60)return"rank_cancer";if(a<70)return"rank_poop";if(a<80)return"rank_ok";if(a<90)return"rank_good";if(a<99)return"rank_great";return"rank_god";}
function ScoreRankName(a){if(a<60)return"cancer";if(a<70)return"bad";if(a<80)return"okay";if(a<90)return"good";if(a<99)return"great";return"LEGENDARY";}
function InitializePreLoad(){matbox.LiveRefresh.Reset();m_compose_sending=false;matbox.ResetTopicVoted();m_timeouts.ClearAll();}
function InitializePostLoad(){if(m_page_state=='live'||m_page_state=='old'){}
matbox.Navbar.Show([{caption:'test',onclick:'testes()'}]);}
$(window).bind("mousewheel",function(ev,delta){var scrollTop=$(window).scrollTop()-Math.round(delta)*51;$(window).scrollTop(scrollTop-Math.round(delta)*51);});$(window).resize(function(){matbox.AdjustSize();});$(window).on('beforeunload',function(){$('#content').css('opacity',0);matbox.Navbar.Hide();});$(document).bind('mousedown',function(e){if(matbox.Loader.IsLoading())return false;});$(document).bind('keydown',function(e){if(matbox.Loader.IsLoading())return false;if((e.which===116)||(e.which===82&&e.ctrlKey)){matbox.Loader.RefreshContent();return false;}});$(function(){matbox.Loader.Load('content.php',-200);});matbox.SetPage=function(page,state){m_page=page;m_page_state=state;}
matbox.GetPage=function(){return m_page;}
matbox.GetPageState=function(){return m_page_state;}
window.matbox.RefreshFromNothing=function(){matbox.Loader.RefreshContent();}
matbox.CompositionKeyPressed=CompositionKeyPressed;matbox.ReplyKeyPressed=ReplyKeyPressed;matbox.SubmitComposition=SubmitComposition;matbox.SubmitComment=SubmitComment;matbox.CloseOld=CloseOld;matbox.InitializePreLoad=InitializePreLoad;matbox.InitializePostLoad=InitializePostLoad;})();(function(){window.matbox=window.matbox||{};matbox.Navbar=this;var m_active=false;var m_options=null;var m_hidden=true;var m_ag=AsyncGroup.Create();function Show(options){m_active=false;if(isSet(options))m_options=options;m_ag.ClearAll();var nav=$("#navigation");nav.clearQueue();if(!m_hidden){nav.queue(HideBar);}
nav.queue(ShowBar);}
function Hide(){m_active=false;m_ag.ClearAll();$("#navigation").clearQueue().queue(HideBar);}
function ShowBar(next){if(m_options==null)next();m_hidden=false;var html=[];for(var i=0;i<m_options.length;i++){html.push('<div class="tab" onclick="',m_options[i].onclick,'">');html.push(m_options[i].caption,'</div>');}
m_active=true;$("#navigation").html(html.join("")).addClass('show');m_ag.Set(next,500);}
function HideBar(next){m_active=false;$("#navigation").removeClass('show');m_ag.Set(function(){m_hidden=true;next();},500);}
this.Show=Show;this.Hide=Hide;})();(function(){window.matbox=window.matbox||{};function AdjustTop(){var poop=$('#topic');var height=poop.height()
+parseInt(poop.css('padding-top'))
+parseInt(poop.css('padding-bottom'));var sh=$(window).height();$("#goodbutton").css("top",(height / 2-16)+"px");$("#badbutton").css("top",(height / 2-16)+"px");$("#scorediv").css("top",(height / 2-16)+"px");$("#newbutton").css("top",(height / 2-16)+"px");height+=16;var margin=((sh/2)-(height/2));if(margin<32){margin=32;}
poop.css('margin-top',margin+"px");}
function AdjustBottom(){if($('#replies').length!=0){var sh=$(window).height();$('#padding').css('height',((sh/2))+"px");}}
function AdjustSize(){AdjustTop();AdjustBottom();var content_width=$(window).width()-72-16;if(content_width>574)content_width=574;if(content_width<32)content_width=32;$('.replies .reply').css('max-width',content_width+'px');}
matbox.AdjustSize=AdjustSize;matbox.AdjustTop=AdjustTop;matbox.AdjustBottom=AdjustBottom;})();(function(){window.matbox=window.matbox||{};matbox.VoteComment=this;function VoteComment(id,upvote){var vgood=$('#votegood'+id);var vbad=$('#votebad'+id);if(upvote){if(vgood.hasClass('selected'))return;}else{if(vbad.hasClass('selected'))return;}
if(upvote){vgood.addClass('selected');vbad.removeClass('selected');vgood.html('<img src="star.png">');vbad.html('<img src="notbad.png">');}else{vgood.removeClass('selected');vbad.addClass('selected');vgood.html('<img src="unstar.png">');vbad.html('<img src="bad.png">');}
$.post('commentvote.php',{page:matbox.GetPage(),comment:id,vote:upvote?'good':'cancer'});}
this.Good=function(id){VoteComment(id,true);}
this.Bad=function(id){VoteComment(id,false);}})();(function(){window.matbox=window.matbox||{};var m_topic_voted=false;function VoteTopic(upvote){if(m_topic_voted)return;m_topic_voted=true;var vgood=$("#goodbutton");var vbad=$("#badbutton");if(upvote){vgood.html('<img src="star.png" alt="good" title="good">');}else{vbad.html('<img src="bad.png" alt="bad" title="bad">');}
vgood.removeClass("clickable");vbad.removeClass("clickable");$.post('topicvote.php',{serial:matbox.GetPage(),vote:upvote?'good':'cancer'}).done(function(data){if(data=='error'){RefreshContent();}else if(data=='good'){}else if(data=='cancer'){RefreshContent();}else if(data=='expired'){RefreshContent();}}).fail(function(){m_topic_voted=false;vgood.html('<img src="unstar.png" alt="good" title="good">');vbad.html('<img src="notbad.png" alt="bad" title="bad">');vgood.addClass("clickable");vbad.addClass("clickable");});}
matbox.VoteTopicGood=function(){VoteTopic(true);}
matbox.VoteTopicBad=function(){VoteTopic(false);}
matbox.ResetTopicVoted=function(){m_topic_voted=false;}})();