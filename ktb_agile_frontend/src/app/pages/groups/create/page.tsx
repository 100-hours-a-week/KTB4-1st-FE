'use client'
import styles from './creategroup.module.css'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/common/navbar/Navbar'

export default function CreateGroup(){
    const router = useRouter()
    return(
        <section className={styles.page}>
            <header className={styles.header}>
                <button className={styles.backButton} onClick={()=>router.back()}>
                {/* 뒤로가기 아이콘 */}
                <svg viewBox="0 0 24 24">
                    <path d="m14.5 5.5-6.5 6.5 6.5 6.5M8 12h12" />
                </svg>
                </button>
                <h1 className={styles.title}>그룹</h1>
            </header>

            <div className={styles.content}>
                <div className={styles.fieldSection}>
                    <p className={styles.fieldLabel}>그룹 명</p>
                    <input
                        className={styles.textInput}
                        type="text"
                        placeholder="그룹명을 입력하세요"
                    />
                </div>

                <div className={styles.fieldSection}>
                    <p className={styles.fieldLabel}>주소</p>
                    <button className={styles.locationButton} type="button">
                        건물 위치 가져오기
                    </button>
                    <div className={styles.locationInfo}>
                        <strong>그룹 주소 :</strong>
                        <span>주소를 가져오면 표시됩니다</span>
                    </div>
                </div>

                <div className={styles.fieldSection}>
                    <p className={styles.fieldLabel}>그룹 설명</p>
                    <p className={styles.optional}>선택사항</p>
                    <textarea
                        className={styles.descriptionInput}
                        placeholder="그룹 설명을 입력하세요"
                    />
                </div>

                <div className={styles.createArea}>
                    <button className={styles.createButton} type="button">
                        그룹 생성
                    </button>
                    <p className={styles.notice}>
                        그룹 설정 사항은 추후 수정할 수 없습니다.
                    </p>
                </div>
            </div>

            <Navbar/>
        </section>
    )
}
