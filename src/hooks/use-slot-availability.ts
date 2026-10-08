import * as React from "react";

export interface SlotInfo {
  available: boolean;
  isPastCutoff: boolean;
  isFullyBooked: boolean;
  bookedCount: number;
  capacity: number;
  remaining: number;
  reason: string | null;
}

export interface SlotAvailabilityState {
  isDateAvailable: boolean;
  dateError: string | null;
  slots: {
    "8am-12pm": SlotInfo;
    "1pm-6pm": SlotInfo;
  };
  dropoff: {
    valid: boolean;
    error: string | null;
  };
  isLoading: boolean;
}

const defaultSlot = (available = true): SlotInfo => ({
  available,
  isPastCutoff: false,
  isFullyBooked: false,
  bookedCount: 0,
  capacity: 15,
  remaining: 15,
  reason: null,
});

export function useSlotAvailability(
  selectedDate: string,
  dropoffDate = "",
  serverToday?: string
) {
  const [state, setState] = React.useState<SlotAvailabilityState>({
    isDateAvailable: true,
    dateError: null,
    slots: {
      "8am-12pm": defaultSlot(true),
      "1pm-6pm": defaultSlot(true),
    },
    dropoff: { valid: true, error: null },
    isLoading: false,
  });

  React.useEffect(() => {
    if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return;

    let active = true;
    setState((prev) => ({ ...prev, isLoading: true }));

    const query = new URLSearchParams({ date: selectedDate });
    if (dropoffDate && /^\d{4}-\d{2}-\d{2}$/.test(dropoffDate)) {
      query.set("dropoff", dropoffDate);
    }

    fetch(`/api/booking-availability?${query.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active || !d?.success) return;
        setState({
          isDateAvailable: Boolean(d.isDateAvailable),
          dateError: d.dateError || null,
          slots: {
            "8am-12pm": d.slots?.["8am-12pm"] || defaultSlot(false),
            "1pm-6pm": d.slots?.["1pm-6pm"] || defaultSlot(false),
          },
          dropoff: {
            valid: Boolean(d.dropoff?.valid ?? true),
            error: d.dropoff?.error || null,
          },
          isLoading: false,
        });
      })
      .catch(() => {
        if (active) setState((prev) => ({ ...prev, isLoading: false }));
      });

    return () => {
      active = false;
    };
  }, [selectedDate, dropoffDate, serverToday]);

  return state;
}
