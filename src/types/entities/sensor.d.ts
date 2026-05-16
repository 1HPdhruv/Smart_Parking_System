export interface SensorData {
  id: string;
  status: "occupied" | "available" | "faulty";
  lastUpdated: string;
}
