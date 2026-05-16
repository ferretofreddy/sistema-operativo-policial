// frontend/src/hooks/useResponsive.js
import { useState, useEffect } from "react";

export const useResponsive = () => {
    const [width, setWidth] = useState(
        typeof window !== "undefined" ? window.innerWidth : 1200
    );

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handleResize, { passive: true });
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return {
        width,
        isMobile: width <= 768,
        isTablet: width > 768 && width <= 1100,
        isDesktop: width > 1100,
        pageSize: width <= 768 ? 10 : 25,
        searchDebounce: width <= 768 ? 500 : 300,
    };
};