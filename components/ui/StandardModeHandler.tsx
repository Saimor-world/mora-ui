"use client";

import { useEffect } from "react";
import { useMoraStore } from "@/lib/store/moraState";

export const StandardModeHandler = () => {
    const isStandardMode = useMoraStore((state) => state.isStandardMode);

    useEffect(() => {
        if (isStandardMode) {
            document.body.classList.add("standard-mode");
        } else {
            document.body.classList.remove("standard-mode");
        }
    }, [isStandardMode]);

    return null;
};
