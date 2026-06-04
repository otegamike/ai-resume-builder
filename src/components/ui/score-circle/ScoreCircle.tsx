import styles from './scoreCircle.module.css'

function ScoreCircle ({score}: {score: number}) {
    return (
        <div className={styles.score_circle} style={{'--score-percent-report': `${score}%`, '--score-percent-color-report': `hsl(${(score * 1.2).toFixed(0)}, 100%, 35%)` } as React.CSSProperties}>
            <span className={styles.score_text}>{score}</span>
        </div>
    )

}

export default ScoreCircle