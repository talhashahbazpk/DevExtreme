export interface ViewCellData {
  startDate: Date;
  endDate: Date;
  text?: string;
  otherMonth?: boolean;
  today?: boolean;
  allDay?: boolean;
  groups?: Record<string, unknown>;
  groupIndex?: number;
  index: number;
  isFirstGroupCell: boolean;
  isLastGroupCell: boolean;
  key: number;
  firstDayOfMonth?: boolean;
  isSelected?: boolean;
  isFocused?: boolean;
}

export interface DateHeaderCellData extends ViewCellData {
  colSpan: number;
}

interface ViewDataBase {
  groupIndex: number;
  isGroupedAllDayPanel?: boolean;
}

interface ViewData extends ViewDataBase {
  dateTable: ViewCellData[][];
  allDayPanel?: ViewCellData[];
}

interface TimePanelCellsData extends ViewDataBase {
  dateTable: ViewCellData[];
  allDayPanel?: ViewCellData;
}

interface GroupedViewDataBase {
  topVirtualRowHeight?: number;
  bottomVirtualRowHeight?: number;
  leftVirtualCellWidth?: number;
  rightVirtualCellWidth?: number;
  leftVirtualCellCount: number;
  rightVirtualCellCount: number;
  topVirtualRowCount: number;
  bottomVirtualRowCount: number;
}

export interface GroupedViewData extends GroupedViewDataBase {
  groupedData: ViewData[];
}

export interface TimePanelData extends GroupedViewDataBase {
  groupedData: TimePanelCellsData[];
}

export interface GroupItem {
  id: number | string;
  text?: string;
  color?: string;
}
export interface GroupRenderItem extends GroupItem {
  key: string;
  resourceName: string;
  data: GroupItem;
  colSpan?: number;
  isFirstGroupCell?: boolean;
  isLastGroupCell?: boolean;
}

export interface GroupPanelData {
  groupPanelItems: GroupRenderItem[][];
  baseColSpan: number;
}

export interface Group {
  name: string;
  items: GroupItem[];
  data: GroupItem[];
}

interface BaseTemplateData {
  groups?: Record<string, unknown>;
  groupIndex?: number;
  allDay?: boolean;
  text?: string;
}

interface DataCellTemplateData extends BaseTemplateData {
  startDate: Date;
  endDate: Date;
}

interface DateCellTemplateData extends BaseTemplateData {
  date: Date;
}

interface TemplateData extends BaseTemplateData {
  date?: Date;
  startDate?: Date;
  endDate?: Date;
}

interface BaseTemplateProps {
  index: number;
}
export interface ContentTemplateProps extends BaseTemplateProps {
  data: TemplateData;
}

export interface DataCellTemplateProps extends BaseTemplateProps {
  data: DataCellTemplateData;
}

export interface DateTimeCellTemplateProps extends BaseTemplateProps {
  data: DateCellTemplateData;
}

interface ResourceCellTemplateData {
  data: GroupItem;
  id: number | string;
  text?: string;
  color?: string;
}

export interface ResourceCellTemplateProps extends BaseTemplateProps {
  data: ResourceCellTemplateData;
}

export interface DateHeaderData {
  dataMap: DateHeaderCellData[][];
  leftVirtualCellWidth: number;
  rightVirtualCellWidth: number;
  leftVirtualCellCount: number;
  rightVirtualCellCount: number;
  weekDayLeftVirtualCellWidth?: number;
  weekDayRightVirtualCellWidth?: number;
  weekDayLeftVirtualCellCount?: number;
  weekDayRightVirtualCellCount?: number;
}

interface CountGenerationConfig {
  intervalCount: number;
  currentDate: Date;
  viewType: string;
  hoursInterval: number;
  startDayHour: number;
  endDayHour: number;
}

// TODO: tempporary
export interface ViewDataProviderType {
  timePanelData: TimePanelData;
  viewData: GroupedViewData;
  dateHeaderData: DateHeaderData;
  getCellCount: (config: CountGenerationConfig) => number;
  getRowCount: (config: CountGenerationConfig) => number;
  update: (options: unknown, isGenerateNewData: boolean) => void;
  getGroupPanelData: (options: unknown) => GroupPanelData;
  getStartViewDate: () => Date;
}

export interface CellsMetaData {
  dateTableCellsMeta: ClientRect[][];
  allDayPanelCellsMeta: ClientRect[];
}

export interface ViewMetaData {
  viewDataProvider: ViewDataProviderType;
  cellsMetaData: CellsMetaData;
}
