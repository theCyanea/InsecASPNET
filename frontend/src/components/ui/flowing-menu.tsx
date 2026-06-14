"use client";

// ─── Flowing Menu — reactbits.dev orijinal ──────────────────────────────────
// Kaynak: https://reactbits.dev/components/flowing-menu
// GSAP timeline ile imlecin girdiği/çıktığı kenara göre beyaz overlay kayıyor,
// içinde text + image alternasyonu olan marquee CSS animasyonu sonsuz dönüyor.

import React, { useRef } from "react";
import { gsap } from "gsap";
import styles from "./flowing-menu.module.css";

export interface MenuItemData {
    link: string;
    text: string;
    image: string;
}

interface FlowingMenuProps {
    items?: MenuItemData[];
}

export function FlowingMenu({ items = [] }: FlowingMenuProps) {
    return (
        <div className={styles.menuWrap}>
            <nav className={styles.menu}>
                {items.map((item, idx) => (
                    <MenuItem key={idx} {...item} />
                ))}
            </nav>
        </div>
    );
}

function MenuItem({ link, text, image }: MenuItemData) {
    const itemRef = useRef<HTMLDivElement | null>(null);
    const marqueeRef = useRef<HTMLDivElement | null>(null);
    const marqueeInnerRef = useRef<HTMLDivElement | null>(null);

    const animationDefaults = { duration: 0.6, ease: "expo" };

    const distMetric = (x: number, y: number, x2: number, y2: number) => {
        const xDiff = x - x2;
        const yDiff = y - y2;
        return xDiff * xDiff + yDiff * yDiff;
    };

    const findClosestEdge = (
        mouseX: number,
        mouseY: number,
        width: number,
        height: number
    ): "top" | "bottom" => {
        const topEdgeDist = distMetric(mouseX, mouseY, width / 2, 0);
        const bottomEdgeDist = distMetric(mouseX, mouseY, width / 2, height);
        return topEdgeDist < bottomEdgeDist ? "top" : "bottom";
    };

    const handleMouseEnter = (ev: React.MouseEvent<HTMLAnchorElement>) => {
        if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
        const rect = itemRef.current.getBoundingClientRect();
        const edge = findClosestEdge(
            ev.clientX - rect.left,
            ev.clientY - rect.top,
            rect.width,
            rect.height
        );

        gsap
            .timeline({ defaults: animationDefaults })
            .set(marqueeRef.current, { y: edge === "top" ? "-101%" : "101%" }, 0)
            .set(marqueeInnerRef.current, { y: edge === "top" ? "101%" : "-101%" }, 0)
            .to([marqueeRef.current, marqueeInnerRef.current], { y: "0%" }, 0);
    };

    const handleMouseLeave = (ev: React.MouseEvent<HTMLAnchorElement>) => {
        if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
        const rect = itemRef.current.getBoundingClientRect();
        const edge = findClosestEdge(
            ev.clientX - rect.left,
            ev.clientY - rect.top,
            rect.width,
            rect.height
        );

        gsap
            .timeline({ defaults: animationDefaults })
            .to(marqueeRef.current, { y: edge === "top" ? "-101%" : "101%" }, 0)
            .to(marqueeInnerRef.current, { y: edge === "top" ? "101%" : "-101%" }, 0);
    };

    const repeatedMarqueeContent = Array.from({ length: 4 }).map((_, idx) => (
        <React.Fragment key={idx}>
            <span>{text}</span>
            <div
                className={styles.marqueeImg}
                style={{ backgroundImage: `url(${image})` }}
            />
        </React.Fragment>
    ));

    return (
        <div className={styles.menuItem} ref={itemRef}>
            <a
                className={styles.menuItemLink}
                href={link}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {text}
            </a>
            <div className={styles.marquee} ref={marqueeRef}>
                <div className={styles.marqueeInnerWrap} ref={marqueeInnerRef}>
                    <div className={styles.marqueeInner} aria-hidden="true">
                        {repeatedMarqueeContent}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FlowingMenu;
