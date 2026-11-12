// Keep bookmarks issued before the public site was introduced.
if (
  /^#\/(?:$|pipeline(?:[?]|$)|leads(?:[?]|$)|settings(?:[?]|$)|billing(?:[?]|$))/.test(
    window.location.hash,
  )
)
  window.location.replace("/app" + window.location.hash);
