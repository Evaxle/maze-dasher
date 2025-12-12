/* Storage helpers moved into a separate module so UI and storage are decoupled */
(function () {
  window.STORAGE_KEYS = {
    MAPS: "mazeRunner_savedMaps",
    HIDE_INSTRUCTIONS: "hideInstructions"
  };

  // expose a normal global variable so legacy code can reference STORAGE_KEYS
  /* eslint-disable no-unused-vars */
  var STORAGE_KEYS = window.STORAGE_KEYS;
  /* eslint-enable no-unused-vars */

  window.getMapsFromStorage = function () {
    try {
      const raw = localStorage.getItem(window.STORAGE_KEYS.MAPS);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  };

  window.setMapsToStorage = function (maps) {
    try {
      localStorage.setItem(window.STORAGE_KEYS.MAPS, JSON.stringify(maps));
    } catch (e) {
      // ignore storage errors
    }
  };

  window.createMapId = function (data) {
    const base = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      hash = (hash << 5) - hash + base.charCodeAt(i);
      hash |= 0;
    }
    return `map_${data.size}_${Math.abs(hash)}`;
  };
})();
