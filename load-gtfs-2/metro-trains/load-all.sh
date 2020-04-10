DIRNAME=$(dirname "$0")

node --max-old-space-size=2048 $DIRNAME/../divide-and-conquer/divide-and-conquer.js 2
node $DIRNAME/load-stops.js
node $DIRNAME/load-routes.js
node $DIRNAME/load-gtfs-timetables.js
node $DIRNAME/extra/load-metro-timetables.js
node $DIRNAME/extra/load-metro-route-stops.js

rm -r $DIRNAME/../spliced-gtfs-stuff/2