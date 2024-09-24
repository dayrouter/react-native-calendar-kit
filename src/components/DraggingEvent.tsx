import React, { FC, useCallback } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useBody } from '../context/BodyContext';
import { useDragEvent } from '../context/DragEventProvider';
import { useTheme } from '../context/ThemeProvider';
import { SelectedEventType } from '../types';
import { clampValues, findNearestNumber } from '../utils/utils';
import DragDot from './DragDot';

export interface DraggingEventProps {
  renderEvent?: (
    event: SelectedEventType | undefined,
    options: {
      width: SharedValue<number>;
      height: SharedValue<number>;
    }
  ) => React.ReactElement | null;
  TopEdgeComponent?: React.ReactElement | null;
  BottomEdgeComponent?: React.ReactElement | null;
  containerStyle?: ViewStyle;
}

export const DraggingEvent: FC<DraggingEventProps> = ({
  renderEvent,
  TopEdgeComponent,
  BottomEdgeComponent,
  containerStyle,
}) => {
  const theme = useTheme(
    useCallback((state) => {
      return {
        primaryColor: state.colors.primary,
        eventContainerStyle: state.eventContainerStyle,
        eventTitleStyle: state.eventTitleStyle,
      };
    }, [])
  );

  const {
    minuteHeight,
    columnWidthAnim,
    start,
    hourWidth,
    visibleDateUnixAnim,
    calendarData,
    columns,
    numberOfDays,
  } = useBody();
  const { dragDuration, dragStartMinutes, dragStartUnix, draggingEvent } =
    useDragEvent();

  const getDayIndex = (dayUnix: number) => {
    'worklet';
    let currentIndex = calendarData.visibleDatesArray.indexOf(dayUnix);
    if (currentIndex === -1) {
      const nearestVisibleUnix = findNearestNumber(
        calendarData.visibleDatesArray,
        dayUnix
      );
      const nearestVisibleIndex =
        calendarData.visibleDates[nearestVisibleUnix]?.index;
      if (!nearestVisibleIndex) {
        return 0;
      }
      currentIndex = nearestVisibleIndex;
    }
    let startIndex = calendarData.visibleDatesArray.indexOf(
      visibleDateUnixAnim.value
    );
    if (startIndex === -1) {
      const nearestVisibleUnix = findNearestNumber(
        calendarData.visibleDatesArray,
        dayUnix
      );
      const nearestVisibleIndex =
        calendarData.visibleDates[nearestVisibleUnix]?.index;
      if (!nearestVisibleIndex) {
        return 0;
      }
      startIndex = nearestVisibleIndex;
    }
    return clampValues(currentIndex - startIndex, 0, columns - 1);
  };

  const internalDayIndex = useSharedValue(getDayIndex(dragStartUnix.value));

  useAnimatedReaction(
    () => dragStartUnix.value,
    (dayUnix) => {
      if (dayUnix !== -1) {
        const dayIndex = getDayIndex(dayUnix);
        internalDayIndex.value = withTiming(dayIndex, { duration: 100 });
      }
    }
  );

  const eventHeight = useDerivedValue(() => {
    return dragDuration.value * minuteHeight.value;
  });

  const animView = useAnimatedStyle(() => {
    return {
      top: (dragStartMinutes.value - start) * minuteHeight.value,
      height: dragDuration.value * minuteHeight.value,
      width: columnWidthAnim.value,
      left: hourWidth + columnWidthAnim.value * internalDayIndex.value - 1,
    };
  });

  return (
    <Animated.View style={[styles.container, animView]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.event,
          {
            backgroundColor: draggingEvent?.color ?? 'transparent',
            borderColor: theme.primaryColor,
          },
          theme.eventContainerStyle,
          containerStyle,
        ]}
      >
        {renderEvent
          ? renderEvent(draggingEvent, {
              width: columnWidthAnim,
              height: eventHeight,
            })
          : !!draggingEvent?.title && (
              <Text style={[styles.eventTitle, theme.eventTitleStyle]}>
                {draggingEvent.title}
              </Text>
            )}
      </View>
      {TopEdgeComponent ? (
        TopEdgeComponent
      ) : (
        <View
          style={[
            styles.dot,
            styles.dotLeft,
            numberOfDays === 1 && styles.dotLeftSingle,
          ]}
        >
          <DragDot />
        </View>
      )}
      {BottomEdgeComponent ? (
        BottomEdgeComponent
      ) : (
        <View
          style={[
            styles.dot,
            styles.dotRight,
            numberOfDays === 1 && styles.dotRightSingle,
          ]}
        >
          <DragDot />
        </View>
      )}
    </Animated.View>
  );
};

interface DraggingEventWrapperProps {
  renderEvent?: (
    event: SelectedEventType | undefined,
    options: {
      width: SharedValue<number>;
      height: SharedValue<number>;
    }
  ) => React.ReactElement | null;
  renderDraggingEvent?: (props: {
    renderEvent?: (
      event: SelectedEventType | undefined,
      options: {
        width: SharedValue<number>;
        height: SharedValue<number>;
      }
    ) => React.ReactElement | null;
  }) => React.ReactElement | null;
}

const DraggingEventWrapper = ({
  renderDraggingEvent,
  renderEvent,
}: DraggingEventWrapperProps) => {
  const { isDragging } = useDragEvent();
  if (!isDragging) {
    return null;
  }

  if (renderDraggingEvent) {
    return renderDraggingEvent({
      renderEvent,
    });
  }

  return <DraggingEvent renderEvent={renderEvent} />;
};

export default DraggingEventWrapper;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
    borderRadius: 12,
    width: 24,
    height: 24,
  },
  event: {
    borderWidth: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dotLeft: { top: -12, left: -12 },
  dotRight: { bottom: -12, right: -12 },
  eventTitle: { fontSize: 12, paddingHorizontal: 2 },
  dotLeftSingle: { left: 0 },
  dotRightSingle: { right: 0 },
});