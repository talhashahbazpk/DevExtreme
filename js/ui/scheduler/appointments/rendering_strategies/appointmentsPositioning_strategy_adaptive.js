
import BasePositioningStrategy from './appointmentsPositioning_strategy_base';

const COLLECTOR_ADAPTIVE_SIZE = 28;
const COLLECTOR_ADAPTIVE_BOTTOM_OFFSET = 40;

const ADAPTIVE_APPOINTMENT_DEFAULT_OFFSET = 35;
const ADAPTIVE_APPOINTMENT_DEFAULT_WIDTH = 30;

class AdaptivePositioningStrategy extends BasePositioningStrategy {
    getDropDownAppointmentWidth(intervalCount, isAllDay) {
        return this.getDropDownButtonAdaptiveSize();
    }

    getDropDownButtonAdaptiveSize() {
        return COLLECTOR_ADAPTIVE_SIZE;
    }

    getCollectorTopOffset(allDay) {
        const renderingStrategy = this.getRenderingStrategy();

        if(renderingStrategy.allDaySupported() && allDay) {
            return (renderingStrategy.allDayHeight - renderingStrategy.getDropDownButtonAdaptiveSize()) / 2;
        } else {
            return this.getRenderingStrategy().cellHeight - COLLECTOR_ADAPTIVE_BOTTOM_OFFSET;
        }
    }

    getCollectorLeftOffset() {
        return (this.getRenderingStrategy().cellWidth - COLLECTOR_ADAPTIVE_SIZE) / 2;
    }

    getAppointmentDefaultOffset() {
        return ADAPTIVE_APPOINTMENT_DEFAULT_OFFSET;
    }

    getDynamicAppointmentCountPerCell() {
        const renderingStrategy = this.getRenderingStrategy();

        if(renderingStrategy.allDaySupported()) {
            return {
                allDay: 0,
                simple: this._calculateDynamicAppointmentCountPerCell() || this._getAppointmentMinCount()
            };
        } else {
            return 0;
        }
    }

    getDropDownAppointmentHeight() {
        return COLLECTOR_ADAPTIVE_SIZE;
    }

    _getAppointmentMinCount() {
        return 0;
    }

    _getAppointmentDefaultWidth() {
        const renderingStrategy = this.getRenderingStrategy();

        if(renderingStrategy.allDaySupported()) {
            return ADAPTIVE_APPOINTMENT_DEFAULT_WIDTH;
        }

        return super._getAppointmentDefaultWidth();
    }

    _calculateDynamicAppointmentCountPerCell() {
        return Math.floor(this.getRenderingStrategy()._getAppointmentMaxWidth() / this.getRenderingStrategy()._getAppointmentDefaultWidth());
    }

}

export default AdaptivePositioningStrategy;
