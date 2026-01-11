import MapViewDirections from "@/components/MapViewDirections";
import * as Location from "expo-location";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";

export default function Index() {
  const [status, requestPermission] = Location.useForegroundPermissions();

  const sourceCoords = {
    latitude: 34.032929,
    longitude: 74.782578,
  };

  const destinationCoords = {
    latitude: 34.070682,
    longitude: 74.786562,
  };

  useEffect(() => {
    requestPermission();
  }, []);

  if (!status?.granted) return;

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView provider={PROVIDER_GOOGLE} style={{ flex: 1 }} showsUserLocation>
        <MapViewDirections
          apikey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY!}
          origin={sourceCoords}
          destination={destinationCoords}
          strokeWidth={6}
          strokeColor="orange"
        />
      </MapView>
    </View>
  );
}
