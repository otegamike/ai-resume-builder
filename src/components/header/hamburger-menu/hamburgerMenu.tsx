import styles from './hamburger-menu.module.css';

export interface MenuPanelProps {
  isMenuOpen: boolean;
  toggleMenu: (menuState?: boolean) => void;
}

interface HamburgerMenuProps {
  menuPanelProps: MenuPanelProps;
}


function HamburgerMenu({ menuPanelProps }: HamburgerMenuProps) {
  const { isMenuOpen, toggleMenu } = menuPanelProps;

  return (
    <div className={`${styles.menu__container} ${isMenuOpen ? styles.active : ''}`}>
      <div className={styles['hamburger-menu']} onClick={() => toggleMenu()}>
        <div className={`${styles.bar} ${isMenuOpen ? styles.cross : ''}`}></div>
        <div className={`${styles.bar} ${isMenuOpen ? styles.cross : ''}`}></div>
        <div className={`${styles.bar} ${isMenuOpen ? styles.cross : ''}`}></div>
      </div>
    </div>
  );
}

export default HamburgerMenu;