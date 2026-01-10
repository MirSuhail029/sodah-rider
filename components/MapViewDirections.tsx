import React, { useEffect, useRef, useState } from "react";
import isEqual from "react-fast-compare";
import { Polyline } from "react-native-maps";

const WAYPOINT_LIMIT = 9;

interface LatLng {
  latitude: number;
  longitude: number;
}

type LocationType = string | LatLng;

interface RouteResult {
  distance: number;
  duration: number;
  coordinates: LatLng[];
  fare?: any;
  waypointOrder: number[];
  legs: any[];
}

interface CombinedRouteResult {
  distance: number;
  duration: number;
  coordinates: LatLng[];
  fares: any[];
  waypointOrder: number[];
  legs: any[];
}

interface Route {
  waypoints: LocationType[];
  origin: LocationType;
  destination: LocationType;
}

interface MapViewDirectionsProps {
  origin: LocationType;
  destination: LocationType;
  waypoints?: LocationType[];
  apikey: string;
  onStart?: (params: {
    origin: string;
    destination: string;
    waypoints: LocationType[];
  }) => void;
  onReady?: (result: CombinedRouteResult) => void;
  onError?: (errorMessage: string) => void;
  mode?: "DRIVING" | "BICYCLING" | "TRANSIT" | "WALKING";
  language?: string;
  optimizeWaypoints?: boolean;
  splitWaypoints?: boolean;
  directionsServiceBaseUrl?: string;
  region?: string;
  precision?: "high" | "low";
  timePrecision?: "now" | "none";
  channel?: string;
  resetOnChange?: boolean;
  [key: string]: any; // For additional polyline props
}

const MapViewDirections: React.FC<MapViewDirectionsProps> = (props) => {
  const {
    origin,
    destination,
    waypoints = [],
    apikey,
    onStart,
    onReady,
    onError,
    mode = "DRIVING",
    language = "en",
    optimizeWaypoints,
    splitWaypoints,
    directionsServiceBaseUrl = "https://maps.googleapis.com/maps/api/directions/json",
    region = "",
    precision = "low",
    timePrecision = "none",
    channel,
    resetOnChange = true,
    ...polylineProps
  } = props;

  const [coordinates, setCoordinates] = useState<LatLng[] | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const prevPropsRef = useRef<{
    origin: LocationType;
    destination: LocationType;
    waypoints: LocationType[];
    mode: string;
    precision: string;
    splitWaypoints?: boolean;
  }>(null);

  const decode = (t: Array<{ polyline: { points: string } }>): LatLng[] => {
    let points: LatLng[] = [];
    for (let step of t) {
      let encoded = step.polyline.points;
      let index = 0,
        len = encoded.length;
      let lat = 0,
        lng = 0;
      while (index < len) {
        let b,
          shift = 0,
          result = 0;
        do {
          b = encoded.charAt(index++).charCodeAt(0) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);

        let dlat = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
        lat += dlat;
        shift = 0;
        result = 0;
        do {
          b = encoded.charAt(index++).charCodeAt(0) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        let dlng = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
        lng += dlng;

        points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
      }
    }
    return points;
  };

  const resetState = (cb: (() => void) | null = null): void => {
    setCoordinates(null);
    setDistance(null);
    setDuration(null);
    if (cb) cb();
  };

  const fetchRoute = async (
    directionsServiceBaseUrl: string,
    origin: string,
    waypoints: string,
    destination: string,
    apikey: string,
    mode: string,
    language: string,
    region: string,
    precision: string,
    timePrecision: string,
    channel?: string
  ): Promise<RouteResult> => {
    try {
      let url = directionsServiceBaseUrl;
      if (typeof directionsServiceBaseUrl === "string") {
        url += `?origin=${origin}&waypoints=${waypoints}&destination=${destination}&key=${apikey}&mode=${mode.toLowerCase()}&language=${language}&region=${region}`;
        if (timePrecision) {
          url += `&departure_time=${timePrecision}`;
        }
        if (channel) {
          url += `&channel=${channel}`;
        }
      }

      const response = await fetch(url);
      const json = await response.json();

      if (json.status !== "OK") {
        const errorMessage =
          json.error_message || json.status || "Unknown error";
        throw new Error(errorMessage);
      }

      if (json.routes.length) {
        const route = json.routes[0];

        return {
          distance:
            route.legs.reduce((carry: number, curr: any) => {
              return carry + curr.distance.value;
            }, 0) / 1000,
          duration:
            route.legs.reduce((carry: number, curr: any) => {
              return (
                carry +
                (curr.duration_in_traffic
                  ? curr.duration_in_traffic.value
                  : curr.duration.value)
              );
            }, 0) / 60,
          coordinates:
            precision === "low"
              ? decode([{ polyline: route.overview_polyline }])
              : route.legs.reduce((carry: LatLng[], curr: any) => {
                  return [...carry, ...decode(curr.steps)];
                }, []),
          fare: route.fare,
          waypointOrder: route.waypoint_order,
          legs: route.legs,
        };
      } else {
        throw new Error("No routes found");
      }
    } catch (err) {
      throw new Error(`Error on GMAPS route request: ${err}`);
    }
  };

  const fetchAndRenderRoute = async (): Promise<void> => {
    if (!apikey) {
      console.warn(`MapViewDirections Error: Missing API Key`);
      return;
    }

    if (!origin || !destination) {
      return;
    }

    const timePrecisionString = timePrecision === "none" ? "" : timePrecision;
    const routes: Route[] = [];

    if (splitWaypoints && waypoints && waypoints.length > WAYPOINT_LIMIT) {
      const chunckedWaypoints = waypoints.reduce(
        (
          accumulator: LocationType[][],
          waypoint: LocationType,
          index: number
        ) => {
          const numChunk = Math.floor(index / WAYPOINT_LIMIT);
          if (!accumulator[numChunk]) {
            accumulator[numChunk] = [];
          }
          accumulator[numChunk].push(waypoint);
          return accumulator;
        },
        []
      );

      for (let i = 0; i < chunckedWaypoints.length; i++) {
        routes.push({
          waypoints: chunckedWaypoints[i],
          origin:
            i === 0
              ? origin
              : chunckedWaypoints[i - 1][chunckedWaypoints[i - 1].length - 1],
          destination:
            i === chunckedWaypoints.length - 1
              ? destination
              : chunckedWaypoints[i][chunckedWaypoints[i].length - 1],
        });
      }
    } else {
      routes.push({
        waypoints: waypoints,
        origin: origin,
        destination: destination,
      });
    }

    try {
      const results: RouteResult[] = await Promise.all(
        routes.map(async (route, index) => {
          let routeOrigin: string | LocationType = route.origin;
          let routeDestination: string | LocationType = route.destination;
          let routeWaypoints = route.waypoints;

          if (
            typeof routeOrigin === "object" &&
            "latitude" in routeOrigin &&
            "longitude" in routeOrigin
          ) {
            routeOrigin = `${routeOrigin.latitude},${routeOrigin.longitude}`;
          }

          if (
            typeof routeDestination === "object" &&
            "latitude" in routeDestination &&
            "longitude" in routeDestination
          ) {
            routeDestination = `${routeDestination.latitude},${routeDestination.longitude}`;
          }

          const waypointsString = routeWaypoints
            .map((waypoint) => {
              if (
                typeof waypoint === "object" &&
                "latitude" in waypoint &&
                "longitude" in waypoint
              ) {
                return `${waypoint.latitude},${waypoint.longitude}`;
              }
              return waypoint;
            })
            .join("|");

          const finalWaypoints = optimizeWaypoints
            ? `optimize:true|${waypointsString}`
            : waypointsString;

          if (index === 0) {
            onStart &&
              onStart({
                origin: routeOrigin as string,
                destination: routeDestination as string,
                waypoints: waypoints,
              });
          }

          return await fetchRoute(
            directionsServiceBaseUrl,
            routeOrigin as string,
            finalWaypoints,
            routeDestination as string,
            apikey,
            mode,
            language,
            region,
            precision,
            timePrecisionString,
            channel
          );
        })
      );

      const result: CombinedRouteResult = results.reduce<CombinedRouteResult>(
        (acc, curr) => {
          return {
            coordinates: [...acc.coordinates, ...curr.coordinates],
            distance: acc.distance + curr.distance,
            duration: acc.duration + curr.duration,
            fares: [...acc.fares, curr.fare],
            legs: curr.legs,
            waypointOrder: [...acc.waypointOrder, ...curr.waypointOrder],
          };
        },
        {
          coordinates: [],
          distance: 0,
          duration: 0,
          fares: [],
          legs: [],
          waypointOrder: [],
        }
      );

      setCoordinates(result.coordinates);
      setDistance(result.distance);
      setDuration(result.duration);

      if (onReady) {
        onReady(result);
      }
    } catch (errorMessage) {
      resetState();
      console.warn(`MapViewDirections Error: ${errorMessage}`);
      onError && onError(errorMessage as string);
    }
  };

  useEffect(() => {
    fetchAndRenderRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prevProps = prevPropsRef.current;

    if (
      prevProps &&
      (!isEqual(prevProps.origin, origin) ||
        !isEqual(prevProps.destination, destination) ||
        !isEqual(prevProps.waypoints, waypoints) ||
        !isEqual(prevProps.mode, mode) ||
        !isEqual(prevProps.precision, precision) ||
        !isEqual(prevProps.splitWaypoints, splitWaypoints))
    ) {
      if (resetOnChange === false) {
        fetchAndRenderRoute();
      } else {
        resetState(() => {
          fetchAndRenderRoute();
        });
      }
    }

    prevPropsRef.current = {
      origin,
      destination,
      waypoints,
      mode,
      precision,
      splitWaypoints,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    origin,
    destination,
    waypoints,
    mode,
    precision,
    splitWaypoints,
    resetOnChange,
  ]);

  if (!coordinates) {
    return null;
  }

  return <Polyline coordinates={coordinates} {...polylineProps} />;
};

export default MapViewDirections;
