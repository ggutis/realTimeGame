
export interface GameStartPayload {
    userId?: string;
}

export interface SummonUnitPayload {
    animalId: string;
    position: {
        x: number;
        y: number;
    };
}
