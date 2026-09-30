import styles from './scoreCircle.module.css'

type ScoreCircleSize = "md" | "sm";

function ScoreCircle ({score, size = "md"}: {score: number; size?: ScoreCircleSize}) {
    const sizeClass = size === "sm" ? styles.score_circle_sm : "";
    return (
        <div className={`${styles.score_circle} ${sizeClass}`} style={{'--score-percent-report': `${score}%`, '--score-percent-color-report': `hsl(${(score * 1.2).toFixed(0)}, 100%, 35%)` } as React.CSSProperties}>
            <span className={`${styles.score_text} ${size === "sm" ? styles.score_text_sm : ""}`}>{score}</span>
        </div>
    )

}

export default ScoreCircle