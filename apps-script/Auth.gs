function requireUser_(payload) {
  if (!CONFIG.REQUIRE_GOOGLE_AUTH) return {email:'anonymous',name:'Anonymous',role:'Admin'};
  const token=String(payload?.authToken||'');
  if(!token) throw new Error('Google sign-in is required.');
  const url='https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(token);
  const res=UrlFetchApp.fetch(url,{muteHttpExceptions:true});
  if(res.getResponseCode()!==200) throw new Error('Invalid or expired Google sign-in token.');
  const info=JSON.parse(res.getContentText());
  if(CONFIG.GOOGLE_CLIENT_ID && info.aud!==CONFIG.GOOGLE_CLIENT_ID) throw new Error('Google client ID mismatch.');
  if(Number(info.exp||0)*1000<Date.now()) throw new Error('Google sign-in token has expired.');
  const email=String(info.email||'').toLowerCase();
  const users=records_('Users');
  const u=users.find(x=>String(x.email||'').toLowerCase()===email && String(x.active).toLowerCase()!=='false');
  if(!u) throw new Error('Your Google account is not authorized for this application.');
  return {email,name:u.name||info.name||email,role:u.role||'Staff'};
}
function assertRole_(user,roles){if(!roles.includes(user.role))throw new Error('You are not authorized to perform this action.');}
