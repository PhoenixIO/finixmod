// ==UserScript==
// @name         FinixMod Public
// @namespace    https://evades.io/
// @version      1.0.0
// @description  Improved timer, player hero and death timer in leaderboard.
// @author       Phoenix
// @include      /http(?:s)?:\/\/(www\.)?(eu\.)?evades\.(io|online)//
// @run-at       document-start
// @grant        none
// ==/UserScript==

getScript('/index.html', html => {
  const scriptURL = html.match(/\/app.[a-z0-9]+.js/)[0];
  html = html.replace(`<script src="${scriptURL}"></script>`, '');

  document.open();
  document.write(html);
  document.close();

  document.addEventListener('DOMContentLoaded', () => {
    getScript(scriptURL, script => {
      console.info(`[INFO] Script length before edit: ${script.length}`);
      script = editScript(script);
      console.info(`[INFO] Script length after edit: ${script.length}`);

      const element = document.createElement('script');
      element.text = script;
      element.async = false;
      document.body.appendChild(element);
    });
  });
});

const client = {
  gameState: null,
};
window.client = client;


function getScript(url, callback) {
  const request = new XMLHttpRequest();

  request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      callback(this.responseText);
    }
  };

  request.open('GET', url, false);
  request.send();
}

function editScript(script) {
  // Init
  script = script.replace('parcelRequire=function', `
    function capitalize(string = '') {
      return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    function getKeyByValue(object, value) {
      return Object.keys(object).find(key => object[key] === value);
    }

    function secondsFormat(time) {
      const minutes = Math.floor(time / 60);
      const seconds = time - minutes * 60;

      return \`\${minutes}:\${seconds < 10 ? '0' : ''}\${seconds}\`;
    }

    parcelRequire = function
  `);

  // Get reference for gameState object
  script = script.replace('var e=this.keys.difference(this.previousKeys),t=this.chatMessages.pop();', `
    client.gameState = this;

    var e=this.keys.difference(this.previousKeys),t=this.chatMessages.pop();
  `);

  // Timer
  script = script.replace('t.font="bold "+e.default.font(35),t.textAlign="center",t.lineWidth=6,t.strokeStyle=this.titleStrokeColor,t.fillStyle=this.titleColor,t.strokeText(n,l,40),t.fillText(n,l,40),t.strokeStyle="#000000",t.lineWidth=1', `
    t.font = "bold " + e.default.font(35);
    t.textAlign = "center";
    t.lineWidth = 6;
    t.strokeStyle = this.titleStrokeColor;
    t.fillStyle = this.titleColor;
    t.strokeText(n, l, 40);
    t.fillText(n, l, 40);

    const survivalTime = secondsFormat(client.gameState.self.entity.survivalTime);
    t.font = 'bold 30px Tahoma, Verdana, Segoe, sans-serif';
    t.strokeText(survivalTime, 640, 80);
    t.fillText(survivalTime, 640, 80);

    t.lineWidth = 1;
    t.strokeStyle = '#000000';
    t.textAlign = 'center';
  `);

  // Set the leaderboard width to 230px
  script = script.replace('var d=i.getBoundingClientRect();i.setAttribute("style",a+"transform-origin: 0% 0%; "+"transform: scale(".concat(o,"); ")+"left: ".concat(c.left+c.width-d.width-10*o,"px; ")+"top: ".concat(c.top+10*o,"px; ")+"visibility: ".concat(i.style.visibility,";"))', `
    i.style.width = 230 + 'px';
    var d = i.getBoundingClientRect();
    i.setAttribute("style",a+"width: 230px; transform-origin: 0% 0%; "+"transform: scale(".concat(o,"); ")+"left: ".concat(c.left+c.width-d.width-10*o,"px; ")+"top: ".concat(c.top+10*o,"px; ")+"visibility: ".concat(i.style.visibility,";"))
  `);

  // Heroes and death timer in the leaderboard
  script = script.replace('return e.default.createElement("div",{className:"leaderboard-line "+this.props.regionClassName+(this.props.player.deathTimer>=0?" leaderboard-downed":"")},e.default.createElement("span",{className:"leaderboard-name"},this.props.name)', `
    const player = this.props.player;
    const globalEntity = client.gameState.globalEntities[player.id] || {};
    const deathTimer = Math.floor(player.deathTimer / 1000);
    const heroName = capitalize(getKeyByValue(client.types.HeroType.values, globalEntity.heroType));
    const heroConfig = client.config.heroes.find(hero => hero.name === heroName) || {};

    return e.default.createElement("div", {
      className: "leaderboard-line " + this.props.regionClassName + (player.deathTimer >= 0 ? " leaderboard-downed" : "")
    }, e.default.createElement("span", {
      className: "leaderboard-name ",
    }, deathTimer !== -1 ? deathTimer + ' • ' : '', this.props.name, \` (\${heroName})\`)
  `);

  // Fix leaderboard bug with multiple nicknames
  script = script.replace('var s=Object.values(e);this.setState({leaderboardProps:{players:s,self:t}})', `
    var players = [];
    for (let player of Object.values(e)) {
      if (!players.find(p => p.name === player.name)) {
        players.push(player);
      }
    }
    this.setState({
      leaderboardProps: {
        players: players,
        self: t
      }
    })
  `);

  // Init types
  script = script.replace('return(e.roots.default||(e.roots.default=new e.Root)).addJSON({', `
    return(e.roots.default||(e.roots.default=new e.Root)).addJSON(client.types = {
  `);

  // Init config
  script = script.replace('module.exports={client_tick_rate:30,', `
    module.exports = client.config = {client_tick_rate: 30,
  `);

  return script;
}