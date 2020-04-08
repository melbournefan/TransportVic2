function formatTime(time) {
  let hours = time.getHours()
  let minutes = time.getMinutes()
  let mainTime = ''

  mainTime += (hours % 12) || 12
  mainTime += ':'
  if (minutes < 10) mainTime += '0'
  mainTime += minutes

  return mainTime
}

function shortenStoppingType (type) {
  if (type === 'Stops All Stations') return 'Stops All'
  if (type === 'Limited Express') return 'Ltd Express'
  return type
}

let stopScrolling = false

let firstRowTimeout, firstRowPause
let secondRowTimeout, secondRowPause

let departures

setInterval(() => {
  $.ajax({
    method: 'POST'
  }, (err, status, body) => {
    departures = body.departures

    let firstDeparture = departures[0]
    let message = $('.message')
    let main = $('.nextDepartures')

    if (!firstDeparture) {
      message.style = 'display: flex;'
      main.style = 'display: none;'
      if (body.hasRRB) {
        message.innerHTML = '<p>NO TRAINS OPERATING</p><p>REPLACEMENT BUSES</p><p>HAVE BEEN ARRANGED</p>'
      } else {
        message.innerHTML = '<p>No trains departing from</p><p>this platform</p>'
      }
    } else {
      message.style = 'display: none;'
      main.style = 'display: block;'
    }

    let classes = ''

    if (firstDeparture.destination.length >= 12)
      classes = ' smaller'
    // if (firstDeparture.destination.length > 15)
    //   classes = 'transform: translateX(-10%) scaleX(0.8)'

    $('.firstDestination').textContent = firstDeparture.destination
    $('.firstDestination').className = `firstDestination${classes}`
    $('div.scheduled p:nth-child(2)').textContent = formatTime(new Date(firstDeparture.scheduledDepartureTime))

    if (firstDeparture.minutesToDeparture > 0) {
      $('div.actual div span:nth-child(1)').textContent = firstDeparture.minutesToDeparture
      $('div.actual div span:nth-child(2)').textContent = 'min'
    } else {
      $('div.actual div span:nth-child(1)').textContent = 'Now'
      $('div.actual div span:nth-child(2)').textContent = ''
    }

    $('.middleRow p:nth-child(1)').textContent = firstDeparture.stoppingType
    $('.middleRow p:nth-child(2)').textContent = firstDeparture.stoppingPattern
    $('.middleRow p:nth-child(2)').setAttribute('data-text', firstDeparture.stoppingPattern)

    let secondDeparture = departures[1]
    let secondClassName = ''

    if (secondDeparture) {
      if (secondDeparture.type === 'vline') secondClassName = ' vline'

      $('div.bottomRow').className = `bottomRow${secondClassName}`
      $('div.bottomRow > span:nth-child(1)').textContent = formatTime(new Date(secondDeparture.scheduledDepartureTime))
      $('div.bottomRow > span:nth-child(2)').textContent = secondDeparture.destination
      $('div.bottomRow > span:nth-child(3)').textContent = shortenStoppingType(secondDeparture.stoppingType)
      $('div.bottomRow > div > span:nth-child(1)').textContent = secondDeparture.minutesToDeparture
    } else {
      $('div.bottomRow').className = `bottomRow`
      $('div.bottomRow > span:nth-child(1)').textContent = '--'
      $('div.bottomRow > span:nth-child(2)').textContent = '--'
      $('div.bottomRow > span:nth-child(3)').textContent = ''
      $('div.bottomRow > div > span:nth-child(1)').textContent = '--'
    }

    if (firstDepartureScheduledTime !== firstDeparture.scheduledDepartureTime) {
      firstDepartureScheduledTime = firstDeparture.scheduledDepartureTime

      stopScrolling = true
      clearTimeout(firstRowTimeout)
      clearTimeout(firstRowPause)
      clearTimeout(secondRowTimeout)
      clearTimeout(secondRowPause)

      drawBottomRow()
    }
  })
}, 1000 * 30)

setInterval(() => {
  $('div.timeNow span').textContent = formatTime(new Date())
}, 1000)

function asyncPause(milliseconds) {
  return new Promise(resolve => {
    pauseTimeout = setTimeout(resolve, milliseconds)
  })
}

let shiftWidth = window.innerWidth / 200 // px
let firstStoppingTypeP
let firstStoppingPatternP

let stoppingPatternWidth = 0

async function animateScrollingText() {
  if (stoppingPatternWidth < window.innerWidth) {
    return await asyncPause(4000)
  }

  let iterationCount = Math.ceil((stoppingPatternWidth) / shiftWidth)
  let xPosition = shiftWidth

  await asyncPause(2000)

  for (let i = 0; i < iterationCount; i++) {
    if (stopScrolling) {
      stopScrolling = false
      return
    }

    xPosition -= shiftWidth
    firstStoppingPatternP.style.marginLeft = xPosition + 'px'
    await asyncPause(10)
  }
  await asyncPause(200)
}

function drawBottomRow() {
  firstStoppingPatternP.textContent = ''
  firstStoppingTypeP.style = 'opacity: 1;'
  firstStoppingPatternP.style = 'opacity: 0;'

  firstRowPause = setTimeout(async () => {
    firstStoppingPatternP.textContent = firstStoppingPatternP.getAttribute('data-text')
    firstStoppingTypeP.style = 'opacity: 0;'
    firstStoppingPatternP.style = 'opacity: 1;'

    stoppingPatternWidth = parseInt(getComputedStyle(firstStoppingPatternP).width) + window.innerWidth * 0.05

    await animateScrollingText()
    drawBottomRow()
  }, 4000)
}

$.ready(() => {

  firstStoppingTypeP = $('div.middleRow p:nth-child(1)')
  firstStoppingPatternP = $('div.middleRow p:nth-child(2)')

  drawBottomRow()
})
