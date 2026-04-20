"use client";

import { useEffect } from "react";
import { useNavStore } from "@/lib/store/navStore";

export const StandardModeHandler = () => {
    const isStandardMode = useNavStore((state) => state.isStandardMode);

    useEffect(() => {
        if (isStandardMode) {
            document.body.classList.add("standard-mode");
        } else {
            document.body.classList.remove("standard-mode");
        }
    }, [isStandardMode]);

    return null;
};
