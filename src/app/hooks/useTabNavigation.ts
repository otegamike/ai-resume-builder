"use client";

import { useCallback, useState, type ComponentType } from "react";
import { FileText, Image, Briefcase, GraduationCap, Code, Layout, FileCheck } from "lucide-react";
import { scrollIntoView } from "@/utils/scrollIntoview";

export type Tab = "headshot" | "personal" | "summary" | "experience" | "education" | "skills" | "finish";

interface TabItem {
  id: Tab;
  icon: ComponentType<{ className?: string; size?: number }>;
  label: string;
}

export const TAB_ARRAY: TabItem[] = [
  { id: "personal", icon: FileText, label: "Personal Details" },
  { id: "headshot", icon: Image, label: "Headshot" },
  { id: "experience", icon: Briefcase, label: "Work Experience" },
  { id: "education", icon: GraduationCap, label: "Education" },
  { id: "skills", icon: Code, label: "Skills" },
  { id: "summary", icon: Layout, label: "Summary" },
  { id: "finish", icon: FileCheck, label: "Finish" },
];

export function useTabNavigation() {
  const [activeTab, setActiveTab] = useState<Tab>("personal");

  const getTabIndex = useCallback((tab: Tab): number => {
    return TAB_ARRAY.findIndex(({ id }) => id === tab);
  }, []);

  const getTabId = useCallback((tabIndex: number): Tab => {
    if (tabIndex >= TAB_ARRAY.length || tabIndex < 0) {
      console.error("Invalid tab index");
      return TAB_ARRAY[0].id;
    }
    return TAB_ARRAY[tabIndex].id;
  }, []);

  const scrollToTab = useCallback((tabId: Tab) => {
    scrollIntoView("formNavBar", `tab-${tabId}`);
  }, []);

  const changeTab = useCallback((newTab: Tab | "next" | "prev") => {
    if (newTab === "next") {
      const tabIndex = getTabIndex(activeTab);
      if (tabIndex < TAB_ARRAY.length - 1) {
        const nextId = getTabId(tabIndex + 1);
        scrollToTab(nextId);
        setActiveTab(nextId);
      }
    } else if (newTab === "prev") {
      const tabIndex = getTabIndex(activeTab);
      if (tabIndex > 0) {
        const prevId = getTabId(tabIndex - 1);
        scrollToTab(prevId);
        setActiveTab(prevId);
      }
    } else {
      scrollToTab(newTab);
      setActiveTab(newTab);
    }
  }, [activeTab, getTabIndex, getTabId, scrollToTab]);

  return { activeTab, setActiveTab, changeTab, getTabIndex, getTabId };
}
