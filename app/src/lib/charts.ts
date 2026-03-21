import { Platform } from 'react-native';

const chartLib =
  Platform.OS === 'web' ? require('victory') : require('victory-native');

export const VictoryLine = chartLib.VictoryLine;
export const VictoryArea = chartLib.VictoryArea;
export const VictoryPie = chartLib.VictoryPie;
export const VictoryChart = chartLib.VictoryChart;
export const VictoryAxis = chartLib.VictoryAxis;
