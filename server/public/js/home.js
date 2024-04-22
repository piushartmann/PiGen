function setAdmin(bool) {
  const rootElement = document.documentElement;
  rootElement.setAttribute('admin', bool);
}