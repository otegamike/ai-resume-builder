import styles from "./dropdown.module.css";
import { useState, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { capitalize } from "@/utils/capitalize";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

interface DropDownProps {
    defaultOption: string;
    options: string[];
    updateSelectedOption: (option: string) => void;
    selectedOption: string | null;
    fullwidth?: boolean;
}

function DropDown({ defaultOption, options, updateSelectedOption, selectedOption, fullwidth }: DropDownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Close the dropdown when clicking outside containerRef
  useOnClickOutside(containerRef as React.RefObject<HTMLElement>, () => setShowDropdown(false));

  const handleOptionSelect = (option: string) => {
    updateSelectedOption(option);
  }



  return (
    <div className={`${styles.relative} ${fullwidth ? styles.fullwidth : ''}`} ref={containerRef} onClick={() => setShowDropdown(!showDropdown)}>
        <Button className={styles.dropdownButton} variant="ghost" size="sm" fullWidth={fullwidth}>
            {selectedOption ? capitalize(selectedOption) : capitalize(defaultOption)}
            {showDropdown
            ? <ChevronUp color="var(--neutral-400)" className={styles.dropdownIcon} size={16} />
            : <ChevronDown color="var(--neutral-400)" className={styles.dropdownIcon} size={16} />
            }
        </Button>
        {showDropdown && (
            <div className={`${styles.dropdown} ${fullwidth ? styles.fullwidth : ''}`}>
                <button
                        key={defaultOption}
                        onClick={() => handleOptionSelect(defaultOption)}
                        className={styles.dropdown_option}
                    >
                        {capitalize(defaultOption)}
                    </button>
                {options.length > 0 && options.map((option) => (
                    <button
                        key={option}
                        onClick={() => handleOptionSelect(option)}
                        className={styles.dropdown_option}
                    >
                        {capitalize(option)}
                    </button>
                ))}
            
            </div>
        )}
    </div>
  );
};

export default DropDown;
