(function() { window.matbox = window.matbox || {};

matbox.LiveRefresh = this;

var m_this = this; 
var m_refreshing = false; 
var m_autorefresh_id = null; 
var m_queued = 0; 
var m_agroup = AsyncGroup.Create();
var m_last_comment = 0; // last comment id that was retrieved
var m_num_comments = 0; // total number of comments on page

//-----------------------------------------------------------------------------
function DequeueNext() {
	m_refreshing = true;
	/*
	if( m_queue.length == 0 ) {
		m_refreshing = false;
		return;
	}*/
	if( m_queued== 0 ) {
		m_refreshing = false;
		return;
	}
	m_queued--;
	//m_current_serial = m_queue.shift();
	DoRefresh();
}

//-----------------------------------------------------------------------------
function CancelAutoRefresh() {
	if( m_autorefresh_handle != null ) {
		m_timeout_group.Clear( m_autorefresh_id );
		m_autorefresh_id = null;
	}
}

//-----------------------------------------------------------------------------
function SetAutoRefresh() {
	CancelAutoRefresh();
	m_autorefresh_id = m_timeout_group.Set( m_this.Refresh, 33*1000 ); 
}

//-----------------------------------------------------------------------------
function ShowCommentReply() {
	// last function in queue string.
	
	m_timeout_group.Set( function() { 
		matbox.ResetReplyInput();
		
		// move to matbox main {{{{{{
		var rpi = $( '#replyinputbox' );
		if( !rpi.hasClass( 'fade' ) ) {
			rpi.css( "opacity", 1 );
		} else {
			if( GetTime() > matbox.GetLastReplyTime() + 10000 ) {
			
				matbox.ShowComposeI
				rpi.removeClass( 'fade' ); 
				rpi.css( 'opacity', 1 ); 
				rpi.css( 'cursor', 'inherit' );
				g_compose_sending = false;
				$( "#replyinput" ).attr( 'contentEditable', true );  
				$( "#replyinput" ).html( '' ); 
				$( "#replyinput" ).addClass( 'init' ); 				
			}
		}
		//}}}}}}}
	}, 500 );
	DequeueNext();
	return;
}
	
//-----------------------------------------------------------------------------
function ChainFadeComments( start, end ) {
	if( end < start ) {
		ShowCommentReply();
		return;
	}
	
	var id = start;
	var func = function() { 
		
		$( '#comment' + id ).css( "opacity", 1 );
		id++;
		if( id <= end ) {
			m_timeout_group.Set( func, 100 );
		} else {
			ShowCommentReply();
			
		}
	}
	m_timeout_group.Set( func, 50 );
}

//-----------------------------------------------------------------------------
function OnAjaxDone( data ) { 
	if( data == 'error' ) {
		DequeueNext();
		return;
	} else if( data == 'expired' || data == 'deleted' ) {
		m_this.Reset(); 
		RefreshContent();
		return;
	} else if( data == 'wrongpage' ) {
		m_this.Reset();
		RefreshContent()
		return;
	} else {
		data = JSON.parse( data );
		
		var startcomment = m_num_comments;
		var topicstate = matbox.GetTopicState();
		
		for( var i = 0; i < data.length; i++ ) {
			
			var entry = data[i];
			
			if( entry.id > m_last_comment ) {
				m_last_comment = entry.id;
			}
			
			if( topicstate == "live" ) {
				var html = [];
				html.push( '<div class="reply" id="comment'+m_num_comments+'">' + entry.content );
				var selected = entry.vote === true ? " selected": "";
				html.push( '<div class="rvote rgood '+selected+'" id="votegood'+entry.id+'" onclick="Button.VoteCommentGood('+entry.id+')">' );
				if( entry.vote === true ) {
					html.push( '<img src="star.png" alt="good" title="good"></div>' );
				} else {
					html.push( '<img src="unstar.png" alt="good" title="good"></div>' );
				}
				
				selected = entry.vote === false ? " selected": "";
				html.push( '<div class="rvote rbad '+selected+'" id="votebad'+entry.id+'" onclick="Button.VoteCommentBad('+entry.id+')">' );
				if( entry.vote === false ) {
					html.push( '<img src="bad.png" alt="bad" title="bad"></div>' );
				} else {
					html.push( '<img src="notbad.png" alt="bad" title="bad"></div>' );
					
				}
				html.push( '</div> ' );
				
				
			} else {
				var html = [];
				html.push( '<div class="reply" id="comment'+m_num_comments+'">' + entry.content );
				html.push( '<div class="score '+ ScoreRank(entry.score) +'" title="'+ScoreRankName(entry.score)+'">' + entry.score + '</div>' );
				html.push( '</div>&nbsp;' );
			}
			m_num_comments++;
			
			$( '#replylist' ).append( html.join("") );
			
		}
		ChainFadeComments( startcomment, m_num_comments-1 );
	}
}

//-----------------------------------------------------------------------------
function DoRefresh() {
	var topicstate = matbox.GetTopicState();
	if( topicstate == 'live' ) {
		SetAutoRefresh();
	} else if( topicstate != 'old' ) {
		console.log( "invalid live-refresh request!" );
		Reset();
		return;
	}
	
	var get = {
		page: matbox.GetPage(),
		last: m_last_comment };
		
	if( topicstate == 'old' ) {
		get.old = 1;
	}

	m_timeout_group.AddAjax( $.get( "liverefresh.php", get ) );
	.done( OnAjaxDone )
	.fail( function( jqXHR, textStatus ) {
		if( textStatus == "abort" ) return;
		
		// try again.
		DequeueNext();
		return;
	});
}
 
//-----------------------------------------------------------------------------
function Refresh() {
	var topicstate = matbox.GetTopicState();
	if( topicstate != 'live' &&
		topicstate != 'old' ) return;
	
	m_queue++;
	if( !m_refreshing ) {
		DequeueNext();
	}
}

//-----------------------------------------------------------------------------
function Reset() {

	CancelAutoRefresh();
	m_queue = [];
	m_refreshing = false;
	m_last_comment = 0;
	m_num_comments = 0;
	m_agroup.ClearAll();
}

this.Reset = Reset;
this.Refresh = Refresh;

})();