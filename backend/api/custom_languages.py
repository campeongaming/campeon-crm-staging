from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import CustomLanguage
from pydantic import BaseModel

router = APIRouter()


class CustomLanguageSchema(BaseModel):
    code: str
    name: str

    class Config:
        from_attributes = True


@router.get("/custom-languages")
def get_custom_languages(db: Session = Depends(get_db)):
    """Get all custom languages"""
    languages = db.query(CustomLanguage).all()
    return [{"code": lang.code, "name": lang.name, "isCustom": True} for lang in languages]


@router.post("/custom-languages")
def create_custom_language(language: CustomLanguageSchema, db: Session = Depends(get_db)):
    """Create a new custom language"""
    # Check if language already exists
    existing = db.query(CustomLanguage).filter(
        CustomLanguage.code == language.code).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="Language code already exists")

    new_language = CustomLanguage(
        code=language.code, name=language.name)
    db.add(new_language)
    db.commit()
    db.refresh(new_language)

    return {"code": new_language.code, "name": new_language.name, "isCustom": True}


@router.delete("/custom-languages/{code}")
def delete_custom_language(code: str, db: Session = Depends(get_db)):
    """Delete a custom language"""
    language = db.query(CustomLanguage).filter(
        CustomLanguage.code == code).first()
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")

    db.delete(language)
    db.commit()

    return {"message": f"Language {code} deleted successfully"}
