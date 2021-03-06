// ==== matbox ====
// Copyright 2014 Mukunda Johnson

(function() { window.matbox = window.matbox || {};

// LiveRefresh module
// for refreshing a topic page dynamically

matbox.LiveRefresh = this;

var m_this = this; 
var m_refreshing = false; 
var m_autorefresh_id = null; 
var m_queued = 0; 
var m_timeout_group = AsyncGroup.Create();
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
	if( m_queued == 0 ) {
		m_refreshing = false;
		return;
	}
	m_queued--;
	//m_current_serial = m_queue.shift();
	DoRefresh();
}

//-----------------------------------------------------------------------------
function CancelAutoRefresh() {
	if( m_autorefresh_id != null ) {
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
function ScoreRank( a ) {
	if( a < 60 ) return "rank_cancer";
	if( a < 70 ) return "rank_poop";
	if( a < 80 ) return "rank_ok";
	if( a < 90 ) return "rank_good";
	if( a < 99 ) return "rank_great";
	return "rank_god";
}

//-----------------------------------------------------------------------------
function ScoreRankName( a ) {
	if( a < 60 ) return "cancer";
	if( a < 70 ) return "bad";
	if( a < 80 ) return "okay";
	if( a < 90 ) return "good";
	if( a < 99 ) return "great";
	return "LEGENDARY";
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
		var topicstate = matbox.GetPageState();
		
		for( var i = 0; i < data.length; i++ ) {
			
			var entry = data[i];
			
			if( entry.id > m_last_comment ) {
				m_last_comment = entry.id;
			}
			
			var html = [];
			if( topicstate == "live" ) {
				html.push( '<div class="reply" id="comment'+m_num_comments+'">' + entry.content );
				var selected = entry.vote === true ? " selected": "";
				html.push( '<div class="rvote rgood '+selected+'" id="votegood'+entry.id+'" onclick="matbox.VoteComment.Good('+entry.id+')">' );
				if( entry.vote === true ) {
					html.push( '<img src="star.png" alt="good" title="good"></div>' );
				} else {
					html.push( '<img src="unstar.png" alt="good" title="good"></div>' );
				}
				
				selected = entry.vote === false ? " selected": "";
				html.push( '<div class="rvote rbad '+selected+'" id="votebad'+entry.id+'" onclick="matbox.VoteComment.Bad('+entry.id+')">' );
				if( entry.vote === false ) {
					html.push( '<img src="bad.png" alt="bad" title="bad"></div>' );
				} else {
					html.push( '<img src="notbad.png" alt="bad" title="bad"></div>' );
					
				}
				html.push( '</div> ' );
				
			} else {
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
	var topicstate = matbox.GetPageState();
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

	m_timeout_group.AddAjax( $.get( "liverefresh.php", get ) )
		.done( OnAjaxDone )
		.fail( function( handle ) {
			if( handle.ag_cancelled ) return;
			
			// try again.
			DequeueNext();
			return;
		});

	
}
 
//-----------------------------------------------------------------------------
function Refresh() {
	var topicstate = matbox.GetPageState();
	if( topicstate != 'live' &&
		topicstate != 'old' ) return;
	
	m_queued++;
	if( !m_refreshing ) {
		DequeueNext();
	}
}

//-----------------------------------------------------------------------------
function Reset() {

	CancelAutoRefresh();
	m_queued = 0;
	m_refreshing = false;
	m_last_comment = 0;
	m_num_comments = 0;
	m_timeout_group.ClearAll();
}

this.Reset = Reset;
this.Refresh = Refresh;

})();
