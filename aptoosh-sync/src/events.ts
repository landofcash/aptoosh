export const EventTypes = (moduleAddress: string) => {
  const m = moduleAddress;
  return {
    ProductEvents: `${m}::products::ProductEvents`,
    OrderEvents: `${m}::orders::OrderEvents`,
  } as const;
};

export type EventType = ReturnType<typeof EventTypes>[keyof ReturnType<typeof EventTypes>];
