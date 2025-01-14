import {
  ComponentBindings, OneWay, Event,
} from '@devextreme-generator/declarations';
import { EventCallback } from '../../common/event_callback';
import {
  BaseScrollableProps,
} from './base_scrollable_props';
import { ScrollEventArgs } from './types.d';

@ComponentBindings()
export class ScrollableSimulatedProps extends BaseScrollableProps {
  @OneWay() inertiaEnabled = true;

  @OneWay() useKeyboard = true;

  @Event() onStart?: EventCallback<ScrollEventArgs>;

  @Event() onEnd?: EventCallback<ScrollEventArgs>;

  @Event() onBounce?: EventCallback<ScrollEventArgs>;

  @Event()
  contentTranslateOffsetChange?: (scrollProp: 'left' | 'top', translateOffset: number) => void;

  @Event()
  scrollLocationChange?: (fullScrollProp: 'scrollLeft' | 'scrollTop', location: number) => void;

  @Event()
  pocketStateChange?: (newState: number) => void;
}
