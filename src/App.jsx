import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, GripVertical, Plus, Save, Search, X } from 'lucide-react'
import { courses, typeLabels } from './courses'

const STORAGE_KEY = 'dit-degree-plan-v1'
const semesterNames = ['1ο', '2ο', '3ο', '4ο', '5ο', '6ο', '7ο', '8ο']

function loadPlan() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

function PlannedCourse({ course, semester, onMove, onRemove }) {
  return (
    <article
      className="planned-course"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/course-id', course.id)
        event.dataTransfer.effectAllowed = 'move'
      }}
    >
      <div className="course-meta">
        <span>{course.semesterLabel}</span>
        <strong>{course.ects} ECTS</strong>
      </div>
      <h3>{course.title}</h3>
      <div className="planned-actions">
        <select
          value={semester}
          onChange={(event) => onMove(course.id, Number(event.target.value))}
          aria-label={`Εξάμηνο για ${course.title}`}
        >
          {semesterNames.map((name, index) => (
            <option key={name} value={index + 1}>{name} εξ.</option>
          ))}
        </select>
        <button onClick={() => onRemove(course.id)} aria-label={`Αφαίρεση ${course.title}`}>
          <X size={15} />
        </button>
        <GripVertical size={16} className="grip" />
      </div>
    </article>
  )
}

function SemesterColumn({ semester, items, onMove, onRemove }) {
  const [isOver, setIsOver] = useState(false)
  const ects = items.reduce((total, course) => total + course.ects, 0)

  return (
    <section
      className={`semester-column ${isOver ? 'is-over' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsOver(false)
        onMove(event.dataTransfer.getData('text/course-id'), semester)
      }}
    >
      <header>
        <div>
          <span>0{semester}</span>
          <h2>{semesterNames[semester - 1]} εξάμηνο</h2>
        </div>
        <strong>{ects} <small>ECTS</small></strong>
      </header>
      <div className="column-courses">
        {items.map((course) => (
          <PlannedCourse
            key={course.id}
            course={course}
            semester={semester}
            onMove={onMove}
            onRemove={onRemove}
          />
        ))}
        {!items.length && <div className="empty-column"><Plus size={20} />Σύρε μάθημα εδώ</div>}
      </div>
    </section>
  )
}

function CatalogCourse({ course, selectedSemester, onToggle }) {
  return (
    <article
      className="catalog-course"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/course-id', course.id)
        event.dataTransfer.effectAllowed = 'copy'
      }}
    >
      <div className="course-meta">
        <span>{course.semesterLabel} · {typeLabels[course.type]}</span>
        <strong>{course.ects} ECTS</strong>
      </div>
      <h3>{course.title}</h3>
      <button className={selectedSemester ? 'selected' : ''} onClick={() => onToggle(course)}>
        {selectedSemester ? <Check size={16} /> : <Plus size={16} />}
        {selectedSemester ? `${selectedSemester}ο εξάμηνο` : 'Προσθήκη'}
      </button>
    </article>
  )
}

export default function App() {
  const [plan, setPlan] = useState(loadPlan)
  const [search, setSearch] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [saved, setSaved] = useState(false)
  const scrollFrame = useRef(null)

  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), [])

  const selectedCourses = useMemo(
    () => courses.filter((course) => plan[course.id]),
    [plan],
  )
  const availableCourses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('el')
    return courses.filter((course) => (
      !plan[course.id]
      && (semesterFilter === 'all' || course.semesterFilters.includes(semesterFilter))
      && (typeFilter === 'all' || course.type === typeFilter)
      && (!term || course.title.toLocaleLowerCase('el').includes(term))
    ))
  }, [plan, search, semesterFilter, typeFilter])
  const totalEcts = selectedCourses.reduce((total, course) => total + course.ects, 0)

  function moveCourse(id, semester) {
    if (!id || !courses.some((course) => course.id === id)) return
    setSaved(false)
    setPlan((current) => ({ ...current, [id]: semester }))
  }

  function removeCourse(id) {
    setSaved(false)
    setPlan((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function toggleCourse(course) {
    if (plan[course.id]) {
      removeCourse(course.id)
    } else {
      moveCourse(course.id, course.defaultSemester)
    }
  }

  function savePlan() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
    setSaved(true)
  }

  function stopAutoScroll() {
    cancelAnimationFrame(scrollFrame.current)
    scrollFrame.current = null
  }

  function handleDragOver(event) {
    const edgeSize = 140
    let speed = 0

    if (event.clientY < edgeSize) {
      speed = -Math.ceil((edgeSize - event.clientY) / 5)
    } else if (event.clientY > window.innerHeight - edgeSize) {
      speed = Math.ceil((event.clientY - (window.innerHeight - edgeSize)) / 5)
    }

    stopAutoScroll()
    if (!speed) return

    const scroll = () => {
      window.scrollBy(0, speed)
      scrollFrame.current = requestAnimationFrame(scroll)
    }
    scrollFrame.current = requestAnimationFrame(scroll)
  }

  return (
    <main onDragOver={handleDragOver} onDragEnd={stopAutoScroll} onDrop={stopAutoScroll}>
      <div className="top-actions">
        <button className={`save-plan ${saved ? 'saved' : ''}`} onClick={savePlan}>
          {saved ? <Check size={17} /> : <Save size={17} />}
          {saved ? 'Αποθηκεύτηκε' : 'Αποθήκευση'}
        </button>
        <div className="total-ects">
          <span>Συνολικά ECTS</span>
          <strong>{totalEcts.toLocaleString('el-GR')}</strong>
        </div>
      </div>

      <section className="semesters">
        {semesterNames.map((_, index) => {
          const semester = index + 1
          return (
            <SemesterColumn
              key={semester}
              semester={semester}
              items={selectedCourses.filter((course) => plan[course.id] === semester)}
              onMove={moveCourse}
              onRemove={removeCourse}
            />
          )
        })}
      </section>

      <section className="course-lists">
        <aside className="declared-section">
          <header>
            <h2>Δηλωμένα</h2>
            <span>{selectedCourses.length}</span>
          </header>
          <div className="declared-list">
            {selectedCourses.map((course) => (
              <CatalogCourse
                key={course.id}
                course={course}
                selectedSemester={plan[course.id]}
                onToggle={toggleCourse}
              />
            ))}
            {!selectedCourses.length && (
              <div className="empty-declared">Τα μαθήματα που προσθέτεις θα εμφανίζονται εδώ.</div>
            )}
          </div>
        </aside>

        <section className="available-section">
          <header>
            <h2>Όλα τα μαθήματα</h2>
            <span>{availableCourses.length}</span>
          </header>
          <div className="course-search">
            <label>
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Αναζήτηση μαθήματος..."
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Καθαρισμός αναζήτησης">
                  <X size={15} />
                </button>
              )}
            </label>
            <select
              value={semesterFilter}
              onChange={(event) => setSemesterFilter(event.target.value)}
              aria-label="Φίλτρο εξαμήνου"
            >
              <option value="all">Όλα τα εξάμηνα</option>
              {semesterNames.map((name, index) => (
                <option key={name} value={index + 1}>{name} εξάμηνο</option>
              ))}
              <option value="winter">Χειμερινό εξάμηνο</option>
              <option value="spring">Εαρινό εξάμηνο</option>
              <option value="annual">Ετήσια μαθήματα</option>
            </select>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              aria-label="Φίλτρο τύπου μαθήματος"
            >
              <option value="all">Όλοι οι τύποι</option>
              <option value="ΥΜ">Υποχρεωτικό</option>
              <option value="ΕΥΜ">Κατ’ επιλογή υποχρεωτικό</option>
              <option value="ΠΜ">Προαιρετικό</option>
            </select>
          </div>
          <div className="catalog">
            {availableCourses.map((course) => (
              <CatalogCourse
                key={course.id}
                course={course}
                onToggle={toggleCourse}
              />
            ))}
            {!availableCourses.length && (
              <div className="no-results">Δεν βρέθηκαν μαθήματα.</div>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
