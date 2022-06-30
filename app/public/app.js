// Add script to render your frontend here


const uiSelectors = {
    tabPane: '#tabs',
    peopleEditor: '#people',
    petsEditor: '#pets'
}


/**
 * Fills the descendents of an element with values from an object according to the property name in each element's data-property attribute
 * @param {HTMLElement} containerElement Element containing descendents with data-property attributes
 * @param {Object} data Object containing properties matching those in the data-property attributes
 */
function fillByDataPropertyAttribute(containerElement, data) {
    // Mutates the original which is not very FP but avoids wasteful DOM cloning and is suitable for what we need here. --GAD
    const filledElements = containerElement.querySelectorAll('[data-property]')

    filledElements.forEach(el => {
        const propertyName = el.dataset.property
        const value = data[propertyName] ?? ''
        // If the element is an input, set its value, otherwise set its textContent. --GAD
        'value' in el
            ? el.value = value
            : el.textContent = value
    })
}


/**
 * Maps an object or array of objects to a <template> using fillByDataPropertyAttribute(), adds specified event listeners, then appends to the <template>'s parent.
 * @param {HTMLTemplateElement} template A <template> containing a single direct child and descendents with data-property attributes.
 * @param {Array<Object>} data An object or array of objects with properties matching the data-property attributes in the <template>
 * @param {?Object} eventListeners An object containing {[event]: handler} properties to apply to the created elements
 */
function expandTemplate(template, data, eventHandlers = {}) {
    const dataArray = Array.isArray(data)
        ? data
        : [data]

    const newRows = dataArray.map((dataObject) => {
        const newRow = template.content.cloneNode(true)
        fillByDataPropertyAttribute(newRow, dataObject)
        const [templateChild] = newRow.children
        templateChild.dataObject = dataObject
        templateChild.classList.add('js-generated')
        Object.entries(eventHandlers).forEach(([event, handler]) => {
            newRow.children[0].addEventListener(event, handler)
        })
        return newRow
    })

    template.parentNode.append(...newRows)
}


/**
 * Returns an object containing the values of elements with a data-property attribute
 * @param {HTMLFormElement} form 
 * @returns {Object}
 */
function getFormValuesAsObject(form, ignoreImmutable = false) {
    return Array.from(form.elements).reduce((acc, current) =>
        current.dataset.property
            ? current.dataset.immutable === 'true' && ignoreImmutable
                ? acc
                : { ...acc, [current.dataset.property]: current.value }
            : acc
        , {}
    )
}


/**
 * Sets up tabs with the expected behaviour.
 * @param {string} selector Selector for the element containing the tab UI.
 */
export function initTabs(selector) {
    const tabs = document.querySelector(selector)
    const buttons = tabs.querySelectorAll('[role=tab]')
    const panels = tabs.querySelectorAll('[role=tabpanel]')
    const tabChangedEvent = new Event('tabchanged')

    let selectedTabId = null
    const setSelectedTabId = id => {
        selectedTabId = id
        tabs.dispatchEvent(tabChangedEvent)
    }

    const hideAllPanels = () => panels.forEach(panel => panel.hidden = true)

    const resetAllButtons = () => buttons.forEach(button => {
        button.ariaSelected = null
        button.classList.remove('tabs__buttons__button--selected')
    })

    const handleTabChanged = () => {
        resetAllButtons()
        hideAllPanels()
        buttons.forEach(button => {
            if (button.tabId !== selectedTabId)
                return
            button.ariaSelected = true
            /* Need to use a class as well for styling, as Firefox doesn't update
             * the DOM on ariaSelected change (although works in Chromium) so can't
             * use [aria-selected=true]. --GAD */
            button.classList.add('tabs__buttons__button--selected')
        })
        document.getElementById(selectedTabId).hidden = false
    }

    tabs.addEventListener('tabchanged', handleTabChanged)

    buttons.forEach(button => {
        const tabId = button.attributes.getNamedItem('aria-controls').value
        button.tabId = tabId // Saves us repeatedly calling getNamedItem() every time the tab changes. --GAD
        button.addEventListener('click', () => {
            setSelectedTabId(tabId)
        })
    })
}


/**
 * Sets up the tables and forms for viewing and editing Person and Pet records. Adds appropriate event listeners
 * and handles internal state.
 * @param {Node} editorSelector Selector matching an editor element
 * @param {Array<Object>} data Array of records
 */
export async function initEditor(editorSelector, apiRoute) {
    const editorElement = document.querySelector(editorSelector)
    const listTemplate = editorElement.querySelector('.js-list-template')
    const editorForm = editorElement.querySelector('.js-editor-form')
    const createButton = editorElement.querySelector('.js-editor-create')
    const deleteButton = editorElement.querySelector('.js-editor-delete')
    const closeFormButton = editorElement.querySelector('.js-editor-close-form')
    const errorPanel = document.querySelector('#app-error')
    const appTitle = document.querySelector('#app-title')

    const dataUpdatedEvent = new Event('dataupdated')
    const errorChangedEvent = new Event('errorchanged')
    const formMethodChangedEvent = new Event('formmethodchanged')
    const selectedItemChangedEvent = new Event('selecteditemchanged')
    const isLoadingChangedEvent = new Event('isloadingchanged')

    let selectedItem = null
    const setSelectedItem = item => {
        // You can take the dev out of the React, but you can't take the React out of the dev! 😜 --GAD
        selectedItem = item
        editorElement.dispatchEvent(selectedItemChangedEvent)
    }

    let error = null
    const setError = message => {
        error = message
        editorElement.dispatchEvent(errorChangedEvent)
    }

    let formMethod = 'POST'
    const setFormMethod = method => {
        formMethod = method
        editorElement.dispatchEvent(formMethodChangedEvent)
    }

    let isLoading = null
    const setIsLoading = bool => {
        isLoading = bool
        editorElement.dispatchEvent(isLoadingChangedEvent)
    }

    const handleClickCreate = () => {
        fillByDataPropertyAttribute(editorForm, {})
        editorForm.hidden = false
        editorForm.action = apiRoute
        setFormMethod('POST')
    }

    const handleClickCloseForm = () => {
        setSelectedItem(null)
    }

    const handleClickItem = e => {
        const { dataObject } = e.currentTarget
        setSelectedItem(dataObject)
    }

    const handleEditorFormDelete = async () => {
        try {
            const response = await (await fetch(`${apiRoute}/${selectedItem.id}`, {
                method: 'DELETE'
            }))
            if (!response.ok)
                throw await response.json()
            setSelectedItem(null)
            editorElement.dispatchEvent(dataUpdatedEvent)
        } catch (err) {
            console.error(err)
            setError(err.message ?? err.toString())
        }
    }

    const handleFormMethodChanged = () => {
        setError(null)
        switch (formMethod) {
            case 'PUT':
                deleteButton.hidden = false
                editorForm.querySelectorAll('[data-immutable=true]')
                    .forEach(el => el.disabled = true)
                break
            case 'POST':
                deleteButton.hidden = true
                editorForm.querySelectorAll('[data-immutable=true]')
                    .forEach(el => el.disabled = false)
                break
        }
    }

    const handleEditorFormSubmit = e => {
        e.preventDefault()
        const route = editorForm.action
        const formData = getFormValuesAsObject(editorForm, formMethod === 'PUT')
            ;
        (async () => {
            try {
                const response = await fetch(route, {
                    body: JSON.stringify(formData),
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    method: formMethod
                })
                if (!response.ok) {
                    throw await response.json()
                }
                const dataUpdatedEvent = new Event('dataupdated', { bubbles: true })
                editorForm.dispatchEvent(dataUpdatedEvent)
                setSelectedItem(null)
            } catch (err) {
                console.error(err)
                setError(err.message ?? err.toString())
            }
        })()
    }

    const handleErrorChanged = () => {
        if (!error) {
            errorPanel.textContent = ''
            errorPanel.hidden = true
            return
        }
        errorPanel.textContent = error
        errorPanel.hidden = false
    }

    const handleIsLoadingChanged = () => {
        appTitle.classList.toggle('app-title--loading', isLoading)
    }

    const handleKeyDownItem = e => { // a11y
        if (!(e.key === ' ' || e.key === 'Enter'))
            return
        e.preventDefault()
        handleClickItem(e)
    }

    const handleSelectedItemChanged = () => {
        setError(null)
        if (selectedItem === null) {
            fillByDataPropertyAttribute(editorForm, {})
            editorElement.classList.remove('panel--form-open')
            editorForm.hidden = true
            return
        }

        editorForm.hidden = false
        editorElement.classList.add('panel--form-open')
        fillByDataPropertyAttribute(editorForm, selectedItem)
        editorForm.action = `${apiRoute}/${selectedItem.id}`
        editorElement.dispatchEvent(formMethodChangedEvent)
        setFormMethod('PUT')
    }

    const refreshList = async () => {
        setIsLoading(true)
        const data = await (await fetch(apiRoute)).json()
        editorElement.querySelectorAll('.js-generated')
            .forEach(el => el.remove())
        expandTemplate(listTemplate, data, {
            click: handleClickItem,
            keydown: handleKeyDownItem
        })
        setIsLoading(false)
    }

    editorElement.addEventListener('dataupdated', refreshList)
    editorElement.addEventListener('errorchanged', handleErrorChanged)
    editorElement.addEventListener('isloadingchanged', handleIsLoadingChanged)
    editorElement.addEventListener('formmethodchanged', handleFormMethodChanged)
    editorElement.addEventListener('selecteditemchanged', handleSelectedItemChanged)
    editorForm.addEventListener('submit', handleEditorFormSubmit)
    createButton.addEventListener('click', handleClickCreate)
    deleteButton.addEventListener('click', handleEditorFormDelete)
    closeFormButton.addEventListener('click', handleClickCloseForm)

    refreshList()
}


window.addEventListener('load', async () => {
    initTabs(uiSelectors.tabPane)
    initEditor(uiSelectors.peopleEditor, '/people')
    initEditor(uiSelectors.petsEditor, '/pets')
})